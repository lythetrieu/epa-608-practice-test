import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  questionId: z.string().min(1),
  reason: z.string().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { questionId, reason } = parsed.data

  // Prevent duplicate reports (same user + same question)
  const { data: existing } = await supabase
    .from('question_reports')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'You have already reported this question.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('question_reports')
    .insert({ user_id: user.id, question_id: questionId, reason })

  if (error) {
    console.error('Failed to insert report:', error)
    return NextResponse.json({ error: 'Failed to submit report.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
