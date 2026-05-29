import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  await supabase.from('user_progress').insert({
    user_id: user.id,
    question_id: parsed.data.questionId,
    correct: parsed.data.correct,
  })

  return NextResponse.json({ ok: true })
}
