import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Accept EITHER a single answer (legacy PracticeClient shape) OR a batch of
// results (Study Path quiz). Both write insert-per-answer to user_progress —
// matching sessions/submit — so Weak Spots + per-question stats aggregate across
// every attempt regardless of where the answer came from.
const single = z.object({
  questionId: z.string(),
  correct: z.boolean(),
})
const batch = z.object({
  results: z.array(z.object({
    questionId: z.string(),
    correct: z.boolean(),
  })).min(1).max(100),
})
const schema = z.union([single, batch])

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const rows = 'results' in parsed.data
    ? parsed.data.results.map(r => ({ user_id: user.id, question_id: r.questionId, correct: r.correct }))
    : [{ user_id: user.id, question_id: parsed.data.questionId, correct: parsed.data.correct }]

  await supabase.from('user_progress').insert(rows)

  return NextResponse.json({ ok: true })
}
