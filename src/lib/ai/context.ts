import { createAdminClient } from '@/lib/supabase/server'
import { getSubtopicLabel } from '@/lib/subtopics'
import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'
import { computeReadiness } from '@/lib/readiness'
import { getPacingData, EXAM_BUDGET_MS } from '@/lib/pacing-server'
import { computeImprovement } from '@/lib/improvement-server'
import { computeCurrentStreak, countActiveDays } from '@/lib/achievements-server'

export async function buildUserContext(userId: string): Promise<string> {
  const admin = createAdminClient()

  // Everything below only needs userId — fire concurrently. Each piece
  // degrades to '' / null independently so one failed source never blanks
  // the whole context.
  const [blindSpotsRes, recentWrongRes, sessionsRes, answersRes, pacing] =
    await Promise.all([
      // 1. Blind spots (top 5)
      admin
        .rpc('get_blind_spots', { p_user_id: userId, p_min_attempts: 3 })
        .then(r => r, () => ({ data: null })),
      // 2. Recent wrong answers (last 10) with what the user actually picked.
      //    `user_answer` is a nullable column added in 20260630; if it's
      //    missing/null we omit the "You answered" part.
      admin
        .from('user_progress')
        .select('question_id, answered_at, user_answer')
        .eq('user_id', userId)
        .eq('correct', false)
        .order('answered_at', { ascending: false })
        .limit(10)
        .then(r => r, () => ({ data: null })),
      // 3. Completed tests, newest-first (readiness needs recency ordering).
      admin
        .from('test_sessions')
        .select('category, score, total, started_at, submitted_at')
        .eq('user_id', userId)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(200)
        .then(r => r, () => ({ data: null })),
      // 4. Recent answer stream — feeds the improvement trend (blocks of 50),
      //    last-practiced date and active-day count. 600 rows matches the
      //    improvement lib's own window cap.
      admin
        .from('user_progress')
        .select('correct, answered_at')
        .eq('user_id', userId)
        .order('answered_at', { ascending: false })
        .limit(600)
        .then(r => r, () => ({ data: null })),
      // 5. Pacing vs the 72s/question exam limit, incl. slowest subtopics.
      getPacingData(userId).then(r => r, () => null),
    ])

  const topWeakSpots = ((blindSpotsRes.data as any[] | null) ?? []).slice(0, 5)
  const recentWrong = recentWrongRes.data as
    | { question_id: string; answered_at: string | null; user_answer?: string | null }[]
    | null

  let wrongContext = ''
  if (recentWrong && recentWrong.length > 0) {
    // Map each question to the answer the user gave (most recent wins).
    const pickedByQ = new Map<string, string | null>()
    for (const r of recentWrong) {
      if (!pickedByQ.has(r.question_id)) {
        pickedByQ.set(r.question_id, (r as { user_answer?: string | null }).user_answer ?? null)
      }
    }
    const qIds = recentWrong.map(r => r.question_id)
    const { data: questions } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, answer_text, explanation')
      .in('id', qIds)

    if (questions) {
      wrongContext = questions.map(q => {
        const picked = pickedByQ.get(q.id)
        const pickedPart = picked ? `You answered: ${picked} | ` : ''
        return `- [${q.category} / ${getSubtopicLabel(q.subtopic_id)}] Q: "${q.question}" | ${pickedPart}Correct: ${q.answer_text} | ${q.explanation}`
      }).join('\n')
    }
  }

  // 3. Overall stats + per-section readiness vs the real 72% pass mark
  const sessions = (sessionsRes.data ?? []) as {
    category: string
    score: number | null
    total: number
    started_at: string | null
    submitted_at: string | null
  }[]

  const totalTests = sessions.length
  const avgScore = totalTests > 0
    ? Math.round(sessions.reduce((sum, s) => sum + ((s.score ?? 0) / s.total) * 100, 0) / totalTests)
    : 0
  const passCount = sessions.filter(s => ((s.score ?? 0) / s.total) >= 0.72).length

  const readiness = computeReadiness(sessions, ['Core', 'Type I', 'Type II', 'Type III', 'Universal'])
  const readinessLine = readiness.byCategory
    .map(c => {
      const weakest = readiness.weakest?.category === c.category && !c.ready ? ', their weakest' : ''
      return `${c.category} ${c.avgPct}% (${c.ready ? 'READY' : `NOT ready — needs ${c.threshold}%`}${weakest})`
    })
    .join(' · ')

  // 3a. How they take tests: pace vs the 72s/question exam limit + trend.
  const answers = (answersRes.data ?? []) as { correct: boolean; answered_at: string | null }[]

  let paceLine = ''
  if (pacing) {
    const avgS = Math.round(pacing.avgMs / 1000)
    const limitS = Math.round(EXAM_BUDGET_MS / 1000)
    const verdict = pacing.avgMs <= EXAM_BUDGET_MS
      ? 'on pace — will finish the exam in time'
      : `TOO SLOW — over the ${limitS}s/question limit, will NOT finish the real exam at this pace`
    const slow = pacing.slowTopics.slice(0, 3).map(t =>
      `${getSubtopicLabel(t.subtopic_id)} (${Math.round(t.avgMs / 1000)}s avg, ${Math.round(t.errorRate * 100)}% wrong)`
    )
    paceLine = `Avg ${avgS}s/question vs ${limitS}s exam limit → ${verdict}.`
      + (slow.length ? ` Slowest topics: ${slow.join('; ')}.` : '')
  }

  const improvement = computeImprovement(answers)
  let trendLine = ''
  if (improvement && improvement.deltaPct !== null) {
    const d = improvement.deltaPct
    trendLine = `Last 100 answers: ${improvement.last100}% correct vs ${improvement.prev100}% on the previous 100 (${d >= 0 ? '+' : ''}${d} pts — ${d > 2 ? 'improving' : d < -2 ? 'DECLINING' : 'flat'}).`
  }

  // 3b'. Engagement: streak, active days, and how long since they last practiced.
  const streak = computeCurrentStreak(sessions)
  const activeDays = countActiveDays(answers, sessions)
  const lastIso = [answers[0]?.answered_at, sessions[0]?.submitted_at]
    .filter((x): x is string => !!x)
    .sort()
    .at(-1)
  let engagementLine = ''
  if (lastIso) {
    const daysAgo = Math.floor((Date.now() - new Date(lastIso).getTime()) / 86_400_000)
    const lastPart = daysAgo <= 0 ? 'practiced today'
      : daysAgo === 1 ? 'last practiced yesterday'
      : `last practiced ${daysAgo} days ago${daysAgo >= 4 ? ' (INACTIVE — worth a gentle nudge to restart)' : ''}`
    engagementLine = `${lastPart} · current streak ${streak} day${streak === 1 ? '' : 's'} · ${activeDays} active days total`
  } else {
    engagementLine = 'has not answered any questions yet (brand new)'
  }

  // 3b. Study Path progress. Reads study_path_progress (may be absent/empty).
  //     Focuses "not yet started" on the user's weak categories so the coach
  //     can point at the exact lesson to fix. Degrades to '' on any failure.
  let studyPathContext = ''
  try {
    const conceptList = Object.values(SUBTOPIC_TO_CONCEPT) // 29 concepts
    const totalConcepts = conceptList.length

    const { data: spp } = await admin
      .from('study_path_progress')
      .select('concept_id, status')
      .eq('user_id', userId)

    const statusByConcept = new Map<string, string>()
    for (const row of spp ?? []) statusByConcept.set(row.concept_id, row.status)

    const masteredCount = conceptList.filter(
      c => statusByConcept.get(c.id) === 'mastered'
    ).length

    // Weak categories = categories of the user's top blind spots.
    const weakCategories = new Set(
      topWeakSpots.map((s: any) => s.category).filter(Boolean)
    )

    // Concepts in weak categories the user hasn't started (no row, or 'pending').
    const notStartedInWeak = conceptList
      .filter(c => weakCategories.has(c.category))
      .filter(c => {
        const st = statusByConcept.get(c.id)
        return !st || st === 'pending'
      })
      .map(c => c.title)

    const lines = [`Mastered: ${masteredCount}/${totalConcepts}.`]
    if (weakCategories.size > 0) {
      lines.push(
        notStartedInWeak.length > 0
          ? `Not yet started in weak areas: ${notStartedInWeak.slice(0, 8).join('; ')}`
          : 'All lessons in weak areas have been started.'
      )
    }
    studyPathContext = lines.join('\n')
  } catch {
    studyPathContext = ''
  }

  // 4. Assemble
  const weakLines = topWeakSpots.map((s: any) =>
    `- ${getSubtopicLabel(s.subtopic_id)} (${s.category}): ${Math.round(s.error_rate * 100)}% error rate, ${s.total_attempts} attempts`
  ).join('\n')

  return `
=== STUDENT PERFORMANCE DATA (live, private — personalize with it, never dump it verbatim) ===
Engagement: ${engagementLine}
Tests completed: ${totalTests} · average score ${avgScore}% · ${passCount} would have passed (72% mark)
Section readiness: ${readinessLine || 'no completed tests yet'}
${paceLine ? `Pacing: ${paceLine}` : 'Pacing: no timed data yet.'}
${trendLine ? `Trend: ${trendLine}` : ''}
Weak areas:
${weakLines || 'Not enough data yet.'}

Recent wrong answers:
${wrongContext || 'None recorded yet.'}
${studyPathContext ? `\nStudy Path status:\n${studyPathContext}` : ''}
=== END STUDENT PERFORMANCE DATA ===`
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
