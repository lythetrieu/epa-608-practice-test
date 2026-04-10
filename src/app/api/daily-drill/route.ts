import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { getSubtopicLabel } from '@/lib/subtopics'

// GET — fetch 10 questions from user's weakest subtopics
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Tier check — Ultimate only
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as keyof typeof TIER_LIMITS
  if (tier !== 'ultimate') {
    return NextResponse.json({ error: 'Daily Drill requires the Ultimate plan.', upgradeRequired: true }, { status: 403 })
  }

  const admin = createAdminClient()

  // Try to get weak-spot questions first
  const { data: weakSpotData } = await admin.rpc('get_weak_spot_questions', {
    p_user_id: user.id,
    p_limit: 10,
  })

  let questionIds: string[] = weakSpotData?.map((q: any) => q.id) ?? []

  // Fall back to random questions if no weak spots
  if (questionIds.length === 0) {
    const categories = TIER_LIMITS[tier].categories
    const perCat = Math.ceil(10 / categories.length)
    for (const cat of categories) {
      const { data } = await admin.rpc('get_random_questions', { p_category: cat, p_limit: perCat })
      questionIds.push(...(data?.map((q: any) => q.id) ?? []))
    }
    questionIds = questionIds.slice(0, 10)
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: 'No questions available.' }, { status: 404 })
  }

  // Shuffle
  questionIds = questionIds.sort(() => Math.random() - 0.5)

  // Fetch question data (no answers)
  const { data: questions } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, difficulty')
    .in('id', questionIds)

  // Shuffle option order per question
  const ordered = questionIds.map(id => {
    const q = questions?.find((q: any) => q.id === id)
    if (!q) return null
    const shuffledOptions = [...(q as any).options].sort(() => Math.random() - 0.5)
    return { ...q, options: shuffledOptions }
  }).filter(Boolean)

  return NextResponse.json({ questions: ordered })
}

// POST — submit drill answers and get results
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Tier check
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.tier !== 'ultimate') {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const answers: Record<string, string> = body.answers ?? {}

  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ error: 'No answers provided' }, { status: 400 })
  }

  const admin = createAdminClient()
  const questionIds = Object.keys(answers)

  // Fetch full questions (with answers) — server-side only
  const { data: questions } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, answer_text, explanation')
    .in('id', questionIds)

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Questions not found' }, { status: 404 })
  }

  // Grade
  let score = 0
  const results = questions.map(q => {
    const userAnswer = answers[q.id] ?? null
    const correct = userAnswer === q.answer_text
    if (correct) score++

    return {
      questionId: q.id,
      correct,
      correctAnswer: q.answer_text,
      userAnswer,
    }
  })

  // Record progress
  const progressRows = questions.map(q => ({
    user_id: user.id,
    question_id: q.id,
    correct: answers[q.id] === q.answer_text,
  }))
  await admin.from('user_progress').insert(progressRows)

  const total = questions.length
  const percentage = (score / total) * 100

  return NextResponse.json({
    score,
    total,
    percentage,
    results,
  })
}
