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
    .select('id, answer_text, explanation, source_ref')
    .in('id', questionIds)

  if (!questions) return NextResponse.json({ error: 'Failed to grade' }, { status: 500 })

  // Score server-side
  const results = questions.map((q: any) => ({
    questionId: q.id,
    correct: answers[q.id] === q.answer_text,
    correctAnswer: q.answer_text,
    explanation: q.explanation,
    sourceRef: q.source_ref,
    userAnswer: answers[q.id] ?? null,
  }))

  const score = results.filter(r => r.correct).length
  const percentage = Math.round((score / results.length) * 100)

  // Save session result
  await supabase.from('test_sessions')
    .update({ submitted_at: new Date().toISOString(), score })
    .eq('id', session.id)

  // Save progress (starter+ only)
  const { data: profile } = await supabase.from('users_profile').select('tier').eq('id', user.id).single()
  if (profile?.tier !== 'free') {
    await supabase.from('user_progress').insert(
      results.map(r => ({ user_id: user.id, question_id: r.questionId, correct: r.correct }))
    )
  }

  return NextResponse.json({ sessionId: session.id, score, total: results.length, percentage, passed: percentage >= 70, results })
}
