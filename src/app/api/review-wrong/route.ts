import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Get all progress most-recent-first; deduplicate by question to find last result
  const { data: progress } = await admin
    .from('user_progress')
    .select('question_id, correct')
    .eq('user_id', user.id)
    .order('answered_at', { ascending: false })
    .limit(2000)

  if (!progress || progress.length === 0) {
    return NextResponse.json({ questions: [] })
  }

  // Keep only the most recent attempt per question, collect those that were wrong
  const seen = new Set<string>()
  const wrongIds: string[] = []
  for (const row of progress) {
    if (seen.has(row.question_id)) continue
    seen.add(row.question_id)
    if (!row.correct) wrongIds.push(row.question_id)
    if (wrongIds.length >= 25) break
  }

  if (wrongIds.length === 0) {
    return NextResponse.json({ questions: [] })
  }

  const { data: questions } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
    .in('id', wrongIds)

  if (!questions || questions.length === 0) {
    return NextResponse.json({ questions: [] })
  }

  // Shuffle options per question
  const shuffled = questions.map((q: {
    id: string; category: string; subtopic_id: string;
    question: string; options: string[]; answer_text: string;
    explanation: string; difficulty: string
  }) => {
    const opts = [...q.options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return { ...q, options: opts }
  })

  return NextResponse.json({ questions: shuffled, total: shuffled.length })
}
