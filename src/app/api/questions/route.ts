import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { questionRateLimit, getIdentifier } from '@/lib/ratelimit'
import { canAccessCategory, TIER_LIMITS } from '@/lib/tier'
import { isFreePool, filterRowsToPool } from '@/lib/question-pool'
import { z } from 'zod'

const schema = z.object({
  category: z.enum(['Core', 'Type I', 'Type II', 'Type III', 'Universal']),
  count: z.number().int().min(1).max(100).default(25),
  mode: z.enum(['random', 'blind-spot', 'practice']).default('random'),
})

// The real exam's sections. 'Universal' is a composite (all four sections),
// never a question category — mixed draws MUST iterate this list, not
// TIER_LIMITS[tier].categories (which includes 'Universal' and would shrink
// the per-section share: the old floor(count/5) loop made a 100-question
// Universal exam return only 80). Real proctored exam: 25 MCQs per section,
// Universal = 25 x 4 = 100.
const EXAM_SECTIONS = ['Core', 'Type I', 'Type II', 'Type III'] as const

export async function POST(request: NextRequest) {
  // Auth must resolve first (rate-limit + profile depend on the user), but the
  // ratelimit check and the profile fetch are independent of each other and run
  // concurrently below. Rate-limit 429 semantics are preserved: we still 429
  // before touching any question data.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { category, count, mode } = parsed.data

  // Run the Upstash rate-limit check and the profile fetch in parallel.
  const [{ success: ok }, { data: profile }] = await Promise.all([
    questionRateLimit.limit(getIdentifier(request)),
    supabase.from('users_profile').select('tier').eq('id', user.id).single(),
  ])

  if (!ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as 'free' | 'starter' | 'ultimate'
  // Free users may only ever draw from the fixed 200-question pool. Unknown
  // tiers resolve to the free (safer) pool inside isFreePool().
  const freeOnly = isFreePool(tier)

  // Practice is the free mode — open to ALL tiers and ALL categories. No gating.
  // For timed ('random') and 'blind-spot', enforce category access.
  if (mode !== 'practice' && category !== 'Universal' && !canAccessCategory(tier, category)) {
    return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
  }

  const admin = createAdminClient()
  let questionIds: string[] = []

  if (mode === 'blind-spot') {
    // Blind-spot mode: serve questions from user's weak subtopics
    if (!TIER_LIMITS[tier].hasBlindSpot) {
      return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
    }

    const { data: weakSpotData } = await admin.rpc('get_weak_spot_questions', {
      p_user_id: user.id,
      p_limit: count,
      p_free_only: freeOnly,
    })
    questionIds = weakSpotData?.map((q: any) => q.id) ?? []

    // Fall back to a balanced random mix across the real sections if no weak
    // spots found (same fix as the Universal branch: never iterate the tier
    // category list, whose 'Universal' entry matches no questions).
    if (questionIds.length === 0) {
      const perCat = Math.floor(count / EXAM_SECTIONS.length)
      // Fetch per-section pools concurrently, then flatten in deterministic
      // section order (results[i] matches EXAM_SECTIONS[i]).
      const results = await Promise.all(
        EXAM_SECTIONS.map(cat =>
          admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat, p_free_only: freeOnly }),
        ),
      )
      for (const { data } of results) {
        questionIds.push(...(data?.map((q: any) => q.id) ?? []))
      }
    }
  } else if (category === 'Universal') {
    // True-to-exam Universal: floor(count/4) from EACH real section, so the
    // default 100-question exam is a 25/25/25/25 split (Core, Type I, II, III).
    const perCat = Math.floor(count / EXAM_SECTIONS.length)
    // One concurrent RPC batch; results are flattened in deterministic section
    // order (results[i] matches EXAM_SECTIONS[i]) — a subsequent Fisher-Yates
    // shuffle randomizes order regardless.
    const results = await Promise.all(
      EXAM_SECTIONS.map(cat =>
        admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat, p_free_only: freeOnly }),
      ),
    )
    for (const { data } of results) {
      questionIds.push(...(data?.map((q: any) => q.id) ?? []))
    }
  } else {
    const { data } = await admin
      .rpc('get_random_questions', { p_category: category, p_limit: count, p_free_only: freeOnly })
    questionIds = data?.map((q: any) => q.id) ?? []
  }

  // Belt-and-braces free-pool guard: even if the RPC migration hasn't run yet
  // (older get_random_questions ignores p_free_only and returns full-bank ids),
  // reduce a free user's candidate ids to the 200-question pool here BEFORE the
  // session is created, so the stored session, timer, and grading all agree.
  if (freeOnly && questionIds.length > 0) {
    const { data: catRows } = await admin
      .from('questions')
      .select('id, category')
      .in('id', questionIds)
    const allowed = new Set(
      filterRowsToPool((catRows ?? []) as { id: string; category: string }[], tier).map(r => r.id),
    )
    questionIds = questionIds.filter(id => allowed.has(id))
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Fisher-Yates shuffle
  for (let i = questionIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]]
  }

  // Create session with server-side timer.
  // Practice = untimed (sentinel 0; surfaced as null). Blind-spot category = 'Weak Spots'.
  // Universal = 3 hours (100 questions), others = 30 min (25 questions).
  const sessionCategory = mode === 'blind-spot' ? 'Weak Spots' : category
  // Sentinel 0 means "untimed". Works on the current NOT NULL schema (no migration
  // required); the submit route treats 0 (and null) as untimed. The accompanying
  // migration makes the column nullable so null can be stored later if desired.
  const timeLimitSecs =
    mode === 'practice' ? 0 : category === 'Universal' ? 10800 : 1800

  // Practice is open-book: include answer_text + explanation with each question.
  // Timed/blind-spot leak NOTHING (no answer_text, no explanation).
  const isPractice = mode === 'practice'
  const selectCols = isPractice
    ? 'id, category, subtopic_id, question, options, difficulty, question_type, answer_text, explanation'
    : 'id, category, subtopic_id, question, options, difficulty, question_type'

  // The question ids are already finalized, so the session INSERT and the
  // question SELECT are independent and run concurrently. Failure semantics are
  // preserved: we check the insert result FIRST and error out (returning nothing)
  // if it failed, so a failed insert can never leak answers even though the
  // SELECT ran in parallel.
  const [
    { data: session, error: sessionErr },
    { data: questions },
  ] = await Promise.all([
    supabase
      .from('test_sessions')
      .insert({
        user_id: user.id,
        category: sessionCategory,
        question_ids: questionIds,
        time_limit_secs: timeLimitSecs,
        total: questionIds.length,
      })
      .select('id, started_at, time_limit_secs')
      .single(),
    admin
      .from('questions')
      .select(selectCols)
      .in('id', questionIds),
  ])

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Return in shuffled order with shuffled options per question
  const ordered = questionIds.map(id => {
    const q = questions?.find((q: any) => q.id === id)
    if (!q) return null
    // Shuffle answer options so correct answer isn't always in the same position
    const shuffledOptions = [...(q as any).options]
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]]
    }
    return { ...(q as any), options: shuffledOptions }
  }).filter(Boolean)

  // Normalize sentinel 0 → null so practice consumers see an untimed session.
  const timeLimitOut: number | null =
    session.time_limit_secs === 0 ? null : session.time_limit_secs

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.started_at,
    timeLimitSecs: timeLimitOut,
    questions: ordered,
  })
}
