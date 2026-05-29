import { createAdminClient } from '@/lib/supabase/server'
import { getSubtopicLabel } from '@/lib/subtopics'

export async function buildUserContext(userId: string): Promise<string> {
  const admin = createAdminClient()

  // 1. Blind spots (top 5)
  const { data: blindSpots } = await admin.rpc('get_blind_spots', {
    p_user_id: userId,
    p_min_attempts: 3,
  })
  const topWeakSpots = (blindSpots ?? []).slice(0, 5)

  // 2. Recent wrong answers (last 10) with question + explanation
  const { data: recentWrong } = await admin
    .from('user_progress')
    .select('question_id, answered_at')
    .eq('user_id', userId)
    .eq('correct', false)
    .order('answered_at', { ascending: false })
    .limit(10)

  let wrongContext = ''
  if (recentWrong && recentWrong.length > 0) {
    const qIds = recentWrong.map(r => r.question_id)
    const { data: questions } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, answer_text, explanation')
      .in('id', qIds)

    if (questions) {
      wrongContext = questions.map(q =>
        `- [${q.category} / ${getSubtopicLabel(q.subtopic_id)}] Q: "${q.question}" | Answer: ${q.answer_text} | ${q.explanation}`
      ).join('\n')
    }
  }

  // 3. Overall stats
  const { data: sessions } = await admin
    .from('test_sessions')
    .select('score, total, submitted_at')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)

  const totalTests = sessions?.length ?? 0
  const avgScore = totalTests > 0
    ? Math.round(sessions!.reduce((sum, s) => sum + ((s.score ?? 0) / s.total) * 100, 0) / totalTests)
    : 0
  const passCount = sessions?.filter(s => ((s.score ?? 0) / s.total) >= 0.70).length ?? 0

  // 4. Assemble
  const weakLines = topWeakSpots.map((s: any) =>
    `- ${getSubtopicLabel(s.subtopic_id)} (${s.category}): ${Math.round(s.error_rate * 100)}% error rate, ${s.total_attempts} attempts`
  ).join('\n')

  return `
=== USER PERFORMANCE DATA ===
Tests completed: ${totalTests}
Average score: ${avgScore}%
Pass rate: ${totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0}%

Weak areas:
${weakLines || 'Not enough data yet.'}

Recent wrong answers:
${wrongContext || 'None recorded yet.'}
=== END USER PERFORMANCE DATA ===`
}

export async function searchRelevantQuestions(query: string, limit = 5): Promise<string> {
  const admin = createAdminClient()

  const stopWords = new Set(['what','is','the','a','an','how','do','you','i','my','me','about','can','tell','explain','why','when','does','are','of','in','to','for','and','or','on','it','if','this','that'])
  const terms = query.toLowerCase().split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t))
    .slice(0, 5)

  if (terms.length === 0) return ''

  const questions: any[] = []
  const seenIds = new Set<string>()

  for (const term of terms) {
    if (questions.length >= limit) break
    const { data } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, answer_text, explanation, source_ref')
      .ilike('question', `%${term}%`)
      .eq('verified', true)
      .limit(limit - questions.length)

    for (const q of (data ?? [])) {
      if (!seenIds.has(q.id)) {
        questions.push(q)
        seenIds.add(q.id)
      }
    }
  }

  if (questions.length === 0) return ''

  const lines = questions.map(q =>
    `- [${q.category} / ${getSubtopicLabel(q.subtopic_id)}] Q: "${q.question}" | Answer: ${q.answer_text} | ${q.explanation}${q.source_ref ? ' | Ref: ' + q.source_ref : ''}`
  ).join('\n')

  return `
=== REFERENCE QUESTIONS ===
${lines}
=== END REFERENCE QUESTIONS ===`
}
