import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

  // Server-side timer enforcement (30s grace)
  const elapsed = (Date.now() - new Date(session.started_at).getTime()) / 1000
  if (elapsed > session.time_limit_secs + 30) {
    await supabase.from('test_sessions').update({ is_expired: true }).eq('id', session.id)
    return NextResponse.json({ error: 'Time expired' }, { status: 410 })
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
    .select('id, category, answer_text, explanation, source_ref')
    .in('id', questionIds)

  if (!questions) return NextResponse.json({ error: 'Failed to grade' }, { status: 500 })

  const showExplanations = true // All tiers get explanations

  // Score server-side
  const results = questions.map((q: any) => ({
    questionId: q.id,
    category: q.category as string,
    correct: answers[q.id] === q.answer_text,
    correctAnswer: q.answer_text,
    explanation: showExplanations ? q.explanation : '',
    sourceRef: showExplanations ? q.source_ref : '',
    userAnswer: answers[q.id] ?? null,
  }))

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

  // Auto-issue certificate if passed
  let newCertificate: { cert_id: string; tier: string } | null = null
  if (passed) {
    // Get display name (fallback to email prefix)
    const { data: profileData } = await supabase
      .from('users_profile')
      .select('display_name, email')
      .eq('id', user.id)
      .single()
    const certName = profileData?.display_name || profileData?.email?.split('@')[0] || 'Student'

    const { data: certResult } = await admin.rpc('issue_certificate', {
      p_user_id: user.id,
      p_user_name: certName,
      p_category: session.category,
      p_score: percentage,
      p_total_questions: results.length,
      p_correct_answers: score,
      p_session_id: session.id,
    })

    if (certResult?.issued) {
      newCertificate = { cert_id: certResult.cert_id, tier: certResult.tier }
    }
  }

  // Strip internal category field from per-question results sent to client
  const clientResults = results.map(({ category: _cat, ...rest }) => rest)

  return NextResponse.json({
    sessionId: session.id, score, total: results.length, percentage, passed,
    results: clientResults,
    ...(sectionScores ? { sectionScores } : {}),
    ...(newCertificate ? { newCertificate } : {}),
  })
}
