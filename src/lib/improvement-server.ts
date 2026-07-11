// Server-only improvement tracking: does the user get better every ~50-100
// questions?
//
// Data source: the SAME 2000-row newest-first user_progress window the
// progress route already fetches for achievements (question_id, correct,
// answered_at) — this module adds ZERO queries. It is pure aggregation over
// every answer source (practice/exam/study; total volume is the point),
// wired in src/app/api/app/progress/route.ts.

// One chart block = 50 answers ("every ~50 questions").
export const IMPROVEMENT_BLOCK_SIZE = 50
// Chart stays readable: only the most recent 12 blocks (600 answers).
const MAX_BLOCKS = 12
const MAX_ANSWERS = IMPROVEMENT_BLOCK_SIZE * MAX_BLOCKS // 600
// A trailing partial block with <10 answers is noise — dropped.
const MIN_PARTIAL_BLOCK = 10
// Below 20 total answers there is no trend to show at all.
const MIN_TOTAL_ANSWERS = 20
// last100 vs prev100 comparison windows; each needs ≥50 answers to be
// meaningful (a 100-answer window may be short when history is short).
const COMPARE_WINDOW = 100
const MIN_COMPARE_ANSWERS = 50

export type ImprovementRow = {
  correct: boolean
  answered_at: string | null
}

export type ImprovementData = {
  blockSize: number
  /** Chronological oldest→newest; ≤12 blocks; last may be partial (n ≥ 10). */
  blocks: { accuracy: number; n: number }[]
  /** Accuracy (0-100, rounded) over the most recent min(100, total) answers. */
  last100: number | null
  /** Accuracy over the up-to-100 answers immediately before the last100 window. */
  prev100: number | null
  /** last100 - prev100 (both already rounded); null if either is null. */
  deltaPct: number | null
}

function accuracyPct(rows: ImprovementRow[]): number {
  const correct = rows.reduce((sum, r) => sum + (r.correct ? 1 : 0), 0)
  return Math.round((correct / rows.length) * 100)
}

/**
 * Pure aggregation over answer rows. Exported for unit tests.
 *
 * Rows arrive newest-first from the indexed (user_id, answered_at DESC) query,
 * but ordering is handled explicitly here: rows are re-sorted chronologically
 * (ISO timestamptz strings compare lexicographically; null answered_at sorts
 * oldest), so callers may pass any order.
 *
 * Returns null when the user has fewer than 20 answers in the window.
 *
 * Rules:
 * - blocks: over the most recent 600 answers, chunked oldest→newest in runs
 *   of 50, so any partial block is the NEWEST one; a partial with <10 answers
 *   is dropped.
 * - last100/prev100: computed over the full chronological sequence (both
 *   windows fit inside the 600 cap anyway); each is null unless its window
 *   holds ≥50 answers.
 */
export function computeImprovement(
  rows: ImprovementRow[],
): ImprovementData | null {
  if (!Array.isArray(rows) || rows.length < MIN_TOTAL_ANSWERS) return null

  const chrono = [...rows].sort((a, b) => {
    const ta = a.answered_at ?? ''
    const tb = b.answered_at ?? ''
    return ta < tb ? -1 : ta > tb ? 1 : 0
  })
  const total = chrono.length

  // ── last100 vs prev100 ──
  let last100: number | null = null
  let prev100: number | null = null
  let deltaPct: number | null = null
  if (total >= MIN_COMPARE_ANSWERS) {
    const lastStart = Math.max(0, total - COMPARE_WINDOW)
    last100 = accuracyPct(chrono.slice(lastStart, total))
    const prevWindow = chrono.slice(
      Math.max(0, lastStart - COMPARE_WINDOW),
      lastStart,
    )
    if (prevWindow.length >= MIN_COMPARE_ANSWERS) {
      prev100 = accuracyPct(prevWindow)
      deltaPct = last100 - prev100
    }
  }

  // ── Accuracy blocks (oldest→newest) over the most recent 600 answers ──
  const capped = chrono.slice(-MAX_ANSWERS)
  const blocks: { accuracy: number; n: number }[] = []
  for (let i = 0; i < capped.length; i += IMPROVEMENT_BLOCK_SIZE) {
    const chunk = capped.slice(i, i + IMPROVEMENT_BLOCK_SIZE)
    if (chunk.length < IMPROVEMENT_BLOCK_SIZE && chunk.length < MIN_PARTIAL_BLOCK) {
      continue // trailing partial too small to chart
    }
    blocks.push({ accuracy: accuracyPct(chunk), n: chunk.length })
  }

  return {
    blockSize: IMPROVEMENT_BLOCK_SIZE,
    blocks,
    last100,
    prev100,
    deltaPct,
  }
}
