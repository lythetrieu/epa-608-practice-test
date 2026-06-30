import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { canonicalMulti, isMulti } from '@/lib/multi'

const schema = z.object({
  answers: z.record(z.string(), z.string()),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: session } = await supabase
    .from('test_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.submitted_at) return NextResponse.json({ error: 'Already submitted' }, { status: 409 })

  // Server-side timer enforcement (30s grace).
  // Untimed practice sessions store time_limit_secs as null or sentinel 0 —
  // skip all time-based enforcement for them (no auto-fail, no "time expired").
  const isUntimed = session.time_limit_secs == null || session.time_limit_secs === 0
  if (!isUntimed) {
    const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000
    if (elapsed > session.time_limit_secs + 30) {
      await supabase.from('test_sessions').update({ is_expired: true }).eq('id', session.id)
      return NextResponse.json({ error: 'Time expired' }, { status: 410 })
    }
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid answers' }, { status: 400 })
  const { answers } = parsed.data

  const admin = createAdminClient()
  const questionIds = session.question_ids as string[]

  // Fetch answers from DB (service role bypasses RLS)
  const { data: questions } = await admin
    .from('questions')
    .select('id, category, answer_text, explanation, source_ref, question_type, correct_answers')
    .in('id', questionIds)

  if (!questions) return NextResponse.json({ error: 'Failed to grade' }, { status: 500 })

  const showExplanations = true // All tiers get explanations

  // Score server-side. multi_select: compare canonical sets; else exact string.
  const results = questions.map((q: any) => {
    const correctAnswer = isMulti(q.question_type) ? canonicalMulti(q.correct_answers as string[]) : q.answer_text
    return {
      questionId: q.id,
      category: q.category as string,
      correct: (answers[q.id] ?? '') === correctAnswer,
      correctAnswer,
      explanation: showExplanations ? q.explanation : '',
      sourceRef: showExplanations ? q.source_ref : '',
      userAnswer: answers[q.id] ?? null,
    }
  })

  const score = results.filter(r => r.correct).length
  const percentage = Math.round((score / results.length) * 100)

  // Universal test: per-section scoring (must pass each section at 72%)
  let passed: boolean
  let sectionScores: { category: string; score: number; total: number; percentage: number; passed: boolean }[] | undefined

  if (session.category === 'Universal') {
    const sections: Record<string, typeof results> = {}
    for (const r of results) {
      if (!sections[r.category]) sections[r.category] = []
      sections[r.category].push(r)
    }
    sectionScores = Object.entries(sections).map(([cat, items]) => {
      const sectionScore = items.filter(r => r.correct).length
      const sectionPct = Math.round((sectionScore / items.length) * 100)
      // Type I is open-book: requires 84% (21/25). All others: 70% (18/25)
      const passThreshold = cat === 'Type I' ? 84 : 70
      return { category: cat, score: sectionScore, total: items.length, percentage: sectionPct, passed: sectionPct >= passThreshold }
    })
    // Sort: Core, Type I, Type II, Type III
    const ORDER = ['Core', 'Type I', 'Type II', 'Type III']
    sectionScores.sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category))
    passed = sectionScores.every(s => s.passed)
  } else {
    // Type I requires 84% (open-book), others 70%
    const passThreshold = session.category === 'Type I' ? 84 : 70
    passed = percentage >= passThreshold
  }

  // Save session result (use admin client to bypass RLS for reliable update)
  const { error: updateErr } = await admin.from('test_sessions')
    .update({ submitted_at: new Date().toISOString(), score })
    .eq('id', session.id)
    .eq('user_id', user.id)

  if (updateErr) {
    console.error('Failed to update session:', updateErr)
    return NextResponse.json({ error: 'Failed to save results' }, { status: 500 })
  }

  // Save progress (use admin client for reliability)
  await admin.from('user_progress').insert(
    results.map(r => ({ user_id: user.id, question_id: r.questionId, correct: r.correct }))
  )

  // Strip internal category field from per-question results sent to client
  const clientResults = results.map(({ category: _cat, ...rest }) => rest)

  return NextResponse.json({
    sessionId: session.id, score, total: results.length, percentage, passed,
    results: clientResults,
    ...(sectionScores ? { sectionScores } : {}),
  })
}
