// Server-only mistakes analysis: which exact questions a user keeps getting
// wrong, and which sections/parts those mistakes cluster in.
//
// Data source: user_progress (one row per graded answer, written by
// /api/app/submit, /api/practice/track and the legacy session submit).
// Table truth (supabase/migrations/001_initial_schema.sql):
//   user_progress(id, user_id, question_id TEXT, correct BOOL,
//                 answered_at TIMESTAMPTZ DEFAULT NOW(), ...)
//   index: idx_user_progress_user ON (user_id, answered_at DESC)
//   questions(id TEXT PK, category CHECK IN (Core/Type I/II/III),
//             question, answer_text NOT NULL, explanation DEFAULT '',
//             question_type, correct_answers, subtopic_id) — no RLS,
//             service-role only by design.
//
// answer_text exposure: this module DOES select answer_text/explanation via
// the admin client, on purpose. It must ONLY ever be called from
// authenticated-only routes (/api/app/* is 401ed by middleware AND the route
// re-checks getCurrentUser). Signed-in accounts are entitled to answers —
// the same fields already flow back from /api/app/submit results. NEVER call
// this from an anon-reachable path (anon question reads go through
// questions_public only).

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canonicalMulti, isMulti } from '@/lib/multi'

// Recent window: newest 1500 answers (answered_at DESC — the indexed sort).
const WINDOW_ROWS = 1500
// Max question cards returned to the client.
const MAX_QUESTIONS = 12
// Sanity cap on distinct question ids resolved for the category rollup.
const MAX_DISTINCT_IDS = 800
// Chunk size for admin .in() lookups (mirrors pacing-server).
const QUESTION_BATCH = 200

// Exam section order for the byCategory rollup.
const CATEGORY_ORDER = ['Core', 'Type I', 'Type II', 'Type III']

export type MistakeRow = {
  question_id: string
  correct: boolean
  answered_at: string | null
}

export type QuestionMistakeStats = {
  question_id: string
  attempts: number
  wrongCount: number
  /** Was the LATEST attempt correct? (newest row per question wins) */
  lastCorrect: boolean
}

export type MistakesAggregate = {
  /**
   * Every question with wrongCount ≥ 1, ranked: still-failing
   * (lastCorrect=false) first, then wrongCount desc, then attempts desc.
   * NOT truncated — callers slice to MAX_QUESTIONS.
   */
  ranked: QuestionMistakeStats[]
  /**
   * Rollup over ALL grouped questions (not just the ranked wrong ones).
   * seenQuestions = distinct questions attempted in the window;
   * wrongQuestions = distinct questions wrong at their last attempt.
   * Only categories with seenQuestions > 0, Core→Type III order.
   */
  byCategory: { category: string; wrongQuestions: number; seenQuestions: number }[]
}

export type MistakeQuestion = {
  question_id: string
  question: string
  category: string
  subtopic_id: string | null
  attempts: number
  wrongCount: number
  lastCorrect: boolean
  correctAnswer: string
  explanation: string | null
}

export type MistakesData = {
  byCategory: MistakesAggregate['byCategory']
  questions: MistakeQuestion[]
}

/**
 * Pure aggregation over answer rows. Exported for unit tests.
 *
 * `rows` MUST be newest-first (answered_at DESC, exactly as the window query
 * returns them) — the first row seen per question_id decides lastCorrect.
 *
 * `categoryByQuestion` maps question_id → category; questions missing from
 * the map (deleted/unresolved) are skipped in byCategory but still ranked.
 *
 * Returns null when the user has no wrong answers at all in the window.
 */
export function aggregateMistakes(
  rows: MistakeRow[],
  categoryByQuestion: Map<string, string>,
): MistakesAggregate | null {
  // ── Group per question (rows are newest-first) ──
  const byQuestion = new Map<string, QuestionMistakeStats>()
  for (const r of rows) {
    const existing = byQuestion.get(r.question_id)
    if (existing) {
      existing.attempts += 1
      if (!r.correct) existing.wrongCount += 1
    } else {
      byQuestion.set(r.question_id, {
        question_id: r.question_id,
        attempts: 1,
        wrongCount: r.correct ? 0 : 1,
        lastCorrect: r.correct, // first row seen = newest attempt
      })
    }
  }

  const ranked = [...byQuestion.values()]
    .filter((s) => s.wrongCount >= 1)
    .sort((a, b) => {
      // Still-failing (lastCorrect=false) first…
      if (a.lastCorrect !== b.lastCorrect) return a.lastCorrect ? 1 : -1
      // …then most-often-wrong…
      if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount
      // …then most-attempted.
      return b.attempts - a.attempts
    })

  // No wrong answers at all → no mistakes section.
  if (ranked.length === 0) return null

  // ── Category rollup over ALL grouped questions ──
  const byCat = new Map<string, { wrong: number; seen: number }>()
  for (const s of byQuestion.values()) {
    const category = categoryByQuestion.get(s.question_id)
    if (!category) continue
    const c = byCat.get(category) ?? { wrong: 0, seen: 0 }
    c.seen += 1
    if (!s.lastCorrect) c.wrong += 1
    byCat.set(category, c)
  }
  const orderIdx = (cat: string) => {
    const i = CATEGORY_ORDER.indexOf(cat)
    return i === -1 ? CATEGORY_ORDER.length : i
  }
  const byCategory = [...byCat.entries()]
    .map(([category, c]) => ({
      category,
      wrongQuestions: c.wrong,
      seenQuestions: c.seen,
    }))
    .sort((a, b) => orderIdx(a.category) - orderIdx(b.category))

  return { ranked, byCategory }
}

type QuestionDetail = {
  id: string
  category: string
  subtopic_id: string | null
  question: string
  answer_text: string
  question_type: string | null
  correct_answers: string[] | null
  explanation: string | null
}

/**
 * Fetch + aggregate mistakes data for a user. Returns null on ANY query
 * failure or when the user has no wrong answers in the window — callers
 * treat null as "no mistakes section" (old cached client payloads simply
 * lack the key).
 *
 * user_progress is read through the RLS client (progress_select_own); the
 * questions lookups use the admin client because questions has no RLS
 * policies (service-role only by design). See the header comment for why
 * answer_text is safe to include HERE and nowhere anon-reachable.
 */
export async function getMistakesData(userId: string): Promise<MistakesData | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id, correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: false })
      .limit(WINDOW_ROWS)
    if (error || !data || data.length === 0) return null

    const rows = data as MistakeRow[]
    const admin = createAdminClient()

    // Lightweight category resolution for ALL distinct ids in the window
    // (capped for sanity; newest-first, so the cap drops the oldest ids).
    const distinctIds: string[] = []
    const seen = new Set<string>()
    for (const r of rows) {
      if (seen.has(r.question_id)) continue
      seen.add(r.question_id)
      distinctIds.push(r.question_id)
      if (distinctIds.length >= MAX_DISTINCT_IDS) break
    }
    const chunks: string[][] = []
    for (let i = 0; i < distinctIds.length; i += QUESTION_BATCH) {
      chunks.push(distinctIds.slice(i, i + QUESTION_BATCH))
    }
    const categoryByQuestion = new Map<string, string>()
    const catResults = await Promise.all(
      chunks.map((chunk) => admin.from('questions').select('id, category').in('id', chunk)),
    )
    for (const res of catResults) {
      if (res.error) return null
      for (const q of (res.data ?? []) as { id: string; category: string }[]) {
        categoryByQuestion.set(q.id, q.category)
      }
    }

    const agg = aggregateMistakes(rows, categoryByQuestion)
    if (!agg) return null

    // Full details for the top cards only (≤ MAX_QUESTIONS ids — one query).
    const topIds = agg.ranked.slice(0, MAX_QUESTIONS).map((s) => s.question_id)
    const { data: details, error: dErr } = await admin
      .from('questions')
      .select(
        'id, category, subtopic_id, question, answer_text, question_type, correct_answers, explanation',
      )
      .in('id', topIds)
    if (dErr || !details) return null

    const detailById = new Map(
      (details as QuestionDetail[]).map((d) => [d.id, d]),
    )
    const questions: MistakeQuestion[] = []
    for (const s of agg.ranked.slice(0, MAX_QUESTIONS)) {
      const d = detailById.get(s.question_id)
      if (!d) continue // question deleted since it was answered — drop the card
      questions.push({
        question_id: s.question_id,
        question: d.question,
        category: d.category,
        subtopic_id: d.subtopic_id ?? null,
        attempts: s.attempts,
        wrongCount: s.wrongCount,
        lastCorrect: s.lastCorrect,
        // Same formatting /api/app/submit returns: canonical joined set for
        // multi_select, plain answer_text otherwise.
        correctAnswer: isMulti(d.question_type)
          ? canonicalMulti(d.correct_answers)
          : d.answer_text,
        explanation: d.explanation ? d.explanation : null,
      })
    }

    return { byCategory: agg.byCategory, questions }
  } catch {
    return null
  }
}
