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

export async function POST(request: NextRequest) {
  const { success: ok } = await questionRateLimit.limit(getIdentifier(request))
  if (!ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { category, count, mode } = parsed.data

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

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

    // Fall back to random questions if no weak spots found
    if (questionIds.length === 0) {
      const cats = TIER_LIMITS[tier].categories
      const perCat = Math.floor(count / cats.length)
      for (const cat of cats) {
        const { data } = await admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat, p_free_only: freeOnly })
        questionIds.push(...(data?.map((q: any) => q.id) ?? []))
      }
    }
  } else if (category === 'Universal') {
    const cats = TIER_LIMITS[tier].categories
    const perCat = Math.floor(count / cats.length)
    for (const cat of cats) {
      const { data } = await admin
        .rpc('get_random_questions', { p_category: cat, p_limit: perCat, p_free_only: freeOnly })
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
  const { data: session, error: sessionErr } = await supabase
    .from('test_sessions')
    .insert({
      user_id: user.id,
      category: sessionCategory,
      question_ids: questionIds,
      time_limit_secs: timeLimitSecs,
      total: questionIds.length,
    })
    .select('id, started_at, time_limit_secs')
    .single()

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Practice is open-book: include answer_text + explanation with each question.
  // Timed/blind-spot leak NOTHING (no answer_text, no explanation).
  const isPractice = mode === 'practice'
  const selectCols = isPractice
    ? 'id, category, subtopic_id, question, options, difficulty, question_type, answer_text, explanation'
    : 'id, category, subtopic_id, question, options, difficulty, question_type'

  const { data: questions } = await admin
    .from('questions')
    .select(selectCols)
    .in('id', questionIds)

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
