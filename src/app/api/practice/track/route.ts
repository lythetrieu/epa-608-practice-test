import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Accept EITHER a single answer (legacy PracticeClient shape) OR a batch of
// results (Study Path quiz). Both write insert-per-answer to user_progress —
// matching sessions/submit — so Weak Spots + per-question stats aggregate across
// every attempt regardless of where the answer came from.
//
// Optional fields (userAnswer/timeMs/attemptNo/source) map to the additive
// user_progress columns from migration 20260630. They are OPTIONAL on both
// shapes; if the ALTER has not been run yet, the insert retries without them
// (see below) so Weak-Spots tracking never breaks.
const item = z.object({
  questionId: z.string(),
  correct: z.boolean(),
  userAnswer: z.string().optional(),
  timeMs: z.number().int().optional(),
  attemptNo: z.number().int().optional(),
  source: z.string().optional(),
})
const single = item
const batch = z.object({
  results: z.array(item).min(1).max(100),
})
const schema = z.union([single, batch])

type Item = z.infer<typeof item>

// Postgres "undefined column" — the new columns haven't been ALTERed in yet.
const UNDEFINED_COLUMN = '42703'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const items: Item[] = 'results' in parsed.data ? parsed.data.results : [parsed.data]

  // Rows WITH the new columns (only set keys that were provided).
  const richRows = items.map((r) => ({
    user_id: user.id,
    question_id: r.questionId,
    correct: r.correct,
    ...(r.userAnswer !== undefined ? { user_answer: r.userAnswer } : {}),
    ...(r.timeMs !== undefined ? { time_ms: r.timeMs } : {}),
    ...(r.attemptNo !== undefined ? { attempt_no: r.attemptNo } : {}),
    ...(r.source !== undefined ? { source: r.source } : {}),
  }))

  const { error } = await supabase.from('user_progress').insert(richRows)

  if (error) {
    // Graceful fallback: if the new columns aren't present yet (42703) — or on
    // ANY insert error — retry with ONLY the original columns so Weak-Spots
    // tracking keeps working regardless of migration timing.
    if (error.code !== UNDEFINED_COLUMN) {
      console.warn('practice/track insert (rich) failed, retrying minimal:', error.message)
    }
    const minimalRows = items.map((r) => ({
      user_id: user.id,
      question_id: r.questionId,
      correct: r.correct,
    }))
    await supabase.from('user_progress').insert(minimalRows)
  }

  return NextResponse.json({ ok: true })
}
