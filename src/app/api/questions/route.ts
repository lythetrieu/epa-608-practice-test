import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { questionRateLimit, getIdentifier } from '@/lib/ratelimit'
import { canAccessCategory, TIER_LIMITS } from '@/lib/tier'
import { z } from 'zod'

const schema = z.object({
  category: z.enum(['Core', 'Type I', 'Type II', 'Type III', 'Universal']),
  count: z.number().int().min(1).max(100).default(25),
  mode: z.enum(['random', 'blind-spot']).default('random'),
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

  if (category !== 'Universal' && !canAccessCategory(tier, category)) {
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
    })
    questionIds = weakSpotData?.map((q: any) => q.id) ?? []

    // Fall back to random questions if no weak spots found
    if (questionIds.length === 0) {
      const cats = TIER_LIMITS[tier].categories
      const perCat = Math.floor(count / cats.length)
      for (const cat of cats) {
        const { data } = await admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat })
        questionIds.push(...(data?.map((q: any) => q.id) ?? []))
      }
    }
  } else if (category === 'Universal') {
    const cats = TIER_LIMITS[tier].categories
    const perCat = Math.floor(count / cats.length)
    for (const cat of cats) {
      const { data } = await admin
        .rpc('get_random_questions', { p_category: cat, p_limit: perCat })
      questionIds.push(...(data?.map((q: any) => q.id) ?? []))
    }
  } else {
    const { data } = await admin
      .rpc('get_random_questions', { p_category: category, p_limit: count })
    questionIds = data?.map((q: any) => q.id) ?? []
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Shuffle server-side
  questionIds = questionIds.sort(() => Math.random() - 0.5)

  // Create session with server-side timer
  // Universal = 3 hours (100 questions), others = 30 min (25 questions)
  const sessionCategory = mode === 'blind-spot' ? 'Weak Spots' : category
  const timeLimitSecs = category === 'Universal' ? 10800 : 1800
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

  // Fetch question data — NO answer_text, NO explanation
  const { data: questions } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, difficulty')
    .in('id', questionIds)

  // Return in shuffled order
  const ordered = questionIds.map(id => questions?.find((q: any) => q.id === id)).filter(Boolean)

  return NextResponse.json({
    sessionId: session.id,
    startedAt: session.started_at,
    timeLimitSecs: session.time_limit_secs,
    questions: ordered,
  })
}
