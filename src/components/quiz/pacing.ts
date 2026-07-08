// Pacing math shared by ResultView (post-test card), TestClient (localStorage
// summary write) and ProgressClient ("Last test pace" card). Pure functions —
// safe in any client component.

import type { AnswerRecord } from './types'

export type PacingSummary = {
  /** Average ACTIVE ms per answered question (see AnswerRecord.timeMs). */
  avgMs: number
  /** Exam budget per question in ms (per-test timeLimitSecs / questionCount). */
  budgetMs: number
  /** How many answers carried timing data. */
  count: number
  /** Projected finish margin over the full test at the user's avg speed (+ = spare). */
  spareMs: number
  /** Human verdict line, e.g. "You'd finish with ~6 min to spare." */
  verdict: string
}

/** Pacing summary persisted to localStorage after each completed test. */
export type LastPacing = {
  date: string
  category: string
  avgMs: number
  budgetMs: number
  verdict: string
}

/** localStorage key (under the epa608:lf: envelope) for the last test's pacing. */
export const lastPacingKey = (userId: string) => `lastPacing:${userId}`

/** 65_000 → "1m05s", 48_000 → "48s". */
export function formatSecs(ms: number): string {
  const secs = Math.round(ms / 1000)
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, '0')}s`
}

/**
 * Compute the pacing summary from a quiz outcome's answer records.
 * Returns null when no answer carried timing data (e.g. legacy sessions).
 */
export function computePacing(
  answers: AnswerRecord[],
  budgetMs: number,
  totalQuestions: number
): PacingSummary | null {
  const times = answers
    .map(a => a.timeMs)
    .filter((t): t is number => typeof t === 'number' && t >= 0)
  if (times.length === 0 || budgetMs <= 0 || totalQuestions <= 0) return null

  const avgMs = times.reduce((a, b) => a + b, 0) / times.length
  // Project the user's average over the WHOLE test vs the total time budget.
  const spareMs = (budgetMs - avgMs) * totalQuestions
  const spareMin = Math.round(Math.abs(spareMs) / 60_000)

  let verdict: string
  if (spareMin === 0) verdict = "You're right on exam pace."
  else if (spareMs > 0) verdict = `You'd finish with ~${spareMin} min to spare.`
  else verdict = `You'd run ~${spareMin} min over — practice faster recall.`

  return {
    avgMs: Math.round(avgMs),
    budgetMs: Math.round(budgetMs),
    count: times.length,
    spareMs: Math.round(spareMs),
    verdict,
  }
}
