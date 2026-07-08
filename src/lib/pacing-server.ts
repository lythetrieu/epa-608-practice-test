// Server-only pacing analytics (per-question timing).
//
// Data source: user_progress.time_ms — additive nullable column from migration
// 20260630_learning_assets_engagement_events.sql. Rows are written by
// /api/app/submit and /api/practice/track (both fall back to inserting without
// time_ms if the migration hasn't run, so this module must degrade to null
// when the column is missing or no timed rows exist).
//
// Table truth (supabase/migrations/001_initial_schema.sql + 20260630):
//   user_progress(id, user_id, question_id TEXT, correct BOOL,
//                 answered_at TIMESTAMPTZ DEFAULT NOW(), time_ms INT NULL, ...)
//   index: idx_user_progress_user ON (user_id, answered_at DESC)
//   questions(id TEXT PK, subtopic_id TEXT NULL, ...) — no RLS, admin-only read.

import { createClient, createAdminClient } from '@/lib/supabase/server'

// Exam pace budget: 1800s time limit / 25 questions = 72s per question.
export const EXAM_BUDGET_MS = 72_000

// Sanity window: <500ms is a mis-tap, >10min is a left-open tab. Both poison
// averages, so they're excluded from every aggregate (and from sampleSize).
const MIN_TIME_MS = 500
const MAX_TIME_MS = 600_000

// Recent window: newest 500 timed answers (answered_at DESC — the indexed sort).
const WINDOW_ROWS = 500
const TREND_DAYS = 10
const MIN_TOPIC_ATTEMPTS = 3
const MAX_SLOW_TOPICS = 6
const QUESTION_BATCH = 200

export type PacingRow = {
  question_id: string
  correct: boolean
  answered_at: string | null
  time_ms: number | null
}

export type PacingData = {
  sampleSize: number
  avgMs: number
  examBudgetMs: number
  /** Per-day averages, oldest→newest, last TREND_DAYS active days (UTC dates). */
  trend: { date: string; avgMs: number; n: number }[]
  /** Slowest first; only subtopics with ≥MIN_TOPIC_ATTEMPTS timed attempts. */
  slowTopics: {
    subtopic_id: string
    avgMs: number
    attempts: number
    errorRate: number
  }[]
}

/**
 * Pure aggregation over timed answer rows. Exported for unit tests.
 * Returns null when no row survives the time_ms sanity filter.
 *
 * `subtopicByQuestion` maps question_id → subtopic_id (null/absent entries are
 * skipped for slowTopics). Pass an empty Map to skip topic aggregation (the
 * dashboard's lighter variant).
 */
export function aggregatePacing(
  rows: PacingRow[],
  subtopicByQuestion: Map<string, string | null>,
): PacingData | null {
  const timed = rows.filter(
    (r): r is PacingRow & { time_ms: number } =>
      typeof r.time_ms === 'number' &&
      r.time_ms >= MIN_TIME_MS &&
      r.time_ms <= MAX_TIME_MS,
  )
  if (timed.length === 0) return null

  const avgMs = Math.round(
    timed.reduce((sum, r) => sum + r.time_ms, 0) / timed.length,
  )

  // ── Per-day trend (UTC day from the timestamptz ISO string) ──
  const byDay = new Map<string, { sum: number; n: number }>()
  for (const r of timed) {
    const date = (r.answered_at ?? '').slice(0, 10)
    if (date.length !== 10) continue
    const day = byDay.get(date) ?? { sum: 0, n: 0 }
    day.sum += r.time_ms
    day.n += 1
    byDay.set(date, day)
  }
  const trend = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1)) // oldest → newest
    .slice(-TREND_DAYS)
    .map(([date, d]) => ({ date, avgMs: Math.round(d.sum / d.n), n: d.n }))

  // ── Slowest subtopics ──
  const byTopic = new Map<string, { sum: number; attempts: number; wrong: number }>()
  for (const r of timed) {
    const subtopicId = subtopicByQuestion.get(r.question_id)
    if (!subtopicId) continue
    const t = byTopic.get(subtopicId) ?? { sum: 0, attempts: 0, wrong: 0 }
    t.sum += r.time_ms
    t.attempts += 1
    if (!r.correct) t.wrong += 1
    byTopic.set(subtopicId, t)
  }
  const slowTopics = [...byTopic.entries()]
    .filter(([, t]) => t.attempts >= MIN_TOPIC_ATTEMPTS)
    .map(([subtopic_id, t]) => ({
      subtopic_id,
      avgMs: Math.round(t.sum / t.attempts),
      attempts: t.attempts,
      errorRate: t.wrong / t.attempts,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, MAX_SLOW_TOPICS)

  return {
    sampleSize: timed.length,
    avgMs,
    examBudgetMs: EXAM_BUDGET_MS,
    trend,
    slowTopics,
  }
}

/**
 * Fetch + aggregate pacing data for a user. Returns null when there is no
 * time_ms data (column missing, migration not run, or user has no timed rows)
 * or on any query error — callers treat null as "no pacing section".
 *
 * `topics: false` skips the questions join entirely (dashboard only needs the
 * overall average) — slowTopics comes back as [].
 *
 * user_progress is read through the RLS client (progress_select_own); the
 * questions join uses the admin client because questions has no RLS policies
 * (service-role only by design) — we select id + subtopic_id ONLY, never
 * answer_text.
 */
export async function getPacingData(
  userId: string,
  opts: { topics?: boolean } = {},
): Promise<PacingData | null> {
  const withTopics = opts.topics !== false
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id, correct, answered_at, time_ms')
      .eq('user_id', userId)
      .not('time_ms', 'is', null)
      .order('answered_at', { ascending: false })
      .limit(WINDOW_ROWS)
    if (error || !data || data.length === 0) return null

    const rows = data as PacingRow[]
    const subtopicByQuestion = new Map<string, string | null>()

    if (withTopics) {
      try {
        const admin = createAdminClient()
        const ids = [...new Set(rows.map((r) => r.question_id))]
        const chunks: string[][] = []
        for (let i = 0; i < ids.length; i += QUESTION_BATCH) {
          chunks.push(ids.slice(i, i + QUESTION_BATCH))
        }
        const results = await Promise.all(
          chunks.map((chunk) =>
            admin.from('questions').select('id, subtopic_id').in('id', chunk),
          ),
        )
        for (const res of results) {
          if (res.error) continue
          for (const q of (res.data ?? []) as { id: string; subtopic_id: string | null }[]) {
            subtopicByQuestion.set(q.id, q.subtopic_id)
          }
        }
      } catch {
        // Topic resolution failed (e.g. no service-role key in this env) —
        // overall pacing is still valid, slowTopics just stays empty.
      }
    }

    return aggregatePacing(rows, subtopicByQuestion)
  } catch {
    return null
  }
}
