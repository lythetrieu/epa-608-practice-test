import { describe, it, expect } from 'vitest'
import {
  computeImprovement,
  IMPROVEMENT_BLOCK_SIZE,
  type ImprovementRow,
} from '../improvement-server'

// Builds rows from a CHRONOLOGICAL (oldest→newest) correctness sequence and
// returns them NEWEST-FIRST — the exact shape the progress route's
// (user_id, answered_at DESC) query hands to computeImprovement.
function newestFirst(seq: boolean[]): ImprovementRow[] {
  const base = Date.UTC(2026, 5, 1)
  return seq
    .map((correct, i) => ({
      correct,
      answered_at: new Date(base + i * 60_000).toISOString(),
    }))
    .reverse()
}

// n answers with exactly `correct` of them correct (correct ones first).
function run(n: number, correct: number): boolean[] {
  return Array.from({ length: n }, (_, i) => i < correct)
}

describe('computeImprovement', () => {
  it('returns null for empty input', () => {
    expect(computeImprovement([])).toBeNull()
  })

  it('returns null below 20 answers', () => {
    expect(computeImprovement(newestFirst(run(19, 19)))).toBeNull()
  })

  it('returns data at exactly 20 answers (one partial block, no last100)', () => {
    const d = computeImprovement(newestFirst(run(20, 10)))
    expect(d).not.toBeNull()
    expect(d!.blockSize).toBe(IMPROVEMENT_BLOCK_SIZE)
    expect(d!.blocks).toEqual([{ accuracy: 50, n: 20 }])
    // <50 total → comparison windows unavailable
    expect(d!.last100).toBeNull()
    expect(d!.prev100).toBeNull()
    expect(d!.deltaPct).toBeNull()
  })

  it('exactly 50 answers → one full block; last100 over all 50; prev100 null', () => {
    const d = computeImprovement(newestFirst(run(50, 40)))
    expect(d!.blocks).toEqual([{ accuracy: 80, n: 50 }])
    expect(d!.last100).toBe(80)
    expect(d!.prev100).toBeNull()
    expect(d!.deltaPct).toBeNull()
  })

  it('drops a trailing partial block with <10 answers', () => {
    // 55 chronological answers: first 50 all correct, newest 5 all wrong.
    const d = computeImprovement(newestFirst([...run(50, 50), ...run(5, 0)]))
    expect(d!.blocks).toEqual([{ accuracy: 100, n: 50 }])
  })

  it('keeps a trailing partial block with ≥10 answers, as the NEWEST block', () => {
    // 60 answers: oldest 50 all correct, newest 10 all wrong.
    const d = computeImprovement(newestFirst([...run(50, 50), ...run(10, 0)]))
    expect(d!.blocks).toEqual([
      { accuracy: 100, n: 50 },
      { accuracy: 0, n: 10 },
    ])
  })

  it('orders blocks chronologically oldest→newest from newest-first input', () => {
    // Oldest 50 all wrong, newest 50 all right → improving left-to-right.
    const d = computeImprovement(newestFirst([...run(50, 0), ...run(50, 50)]))
    expect(d!.blocks).toEqual([
      { accuracy: 0, n: 50 },
      { accuracy: 100, n: 50 },
    ])
  })

  it('handles already-chronological input identically (sort is explicit)', () => {
    const seq = [...run(50, 0), ...run(50, 50)]
    const chronological = [...newestFirst(seq)].reverse()
    expect(computeImprovement(chronological)).toEqual(
      computeImprovement(newestFirst(seq)),
    )
  })

  it('caps at the most recent 600 answers (12 blocks), dropping the oldest', () => {
    // 700 answers: oldest 100 all wrong, newest 600 all correct. If the cap
    // failed, the first block(s) would show 0% accuracy.
    const d = computeImprovement(newestFirst([...run(100, 0), ...run(600, 600)]))
    expect(d!.blocks).toHaveLength(12)
    expect(d!.blocks.every(b => b.n === 50 && b.accuracy === 100)).toBe(true)
  })

  it('computes last100/prev100 and a positive deltaPct when improving', () => {
    // 200 answers: prev 100 at 40%, last 100 at 80%.
    const d = computeImprovement(newestFirst([...run(100, 40), ...run(100, 80)]))
    expect(d!.last100).toBe(80)
    expect(d!.prev100).toBe(40)
    expect(d!.deltaPct).toBe(40)
  })

  it('computes a negative deltaPct when regressing', () => {
    const d = computeImprovement(newestFirst([...run(100, 80), ...run(100, 40)]))
    expect(d!.last100).toBe(40)
    expect(d!.prev100).toBe(80)
    expect(d!.deltaPct).toBe(-40)
  })

  it('prev100 stays null when the previous window has <50 answers', () => {
    // 120 answers → last window = newest 100, prev window = only 20.
    const d = computeImprovement(newestFirst(run(120, 120)))
    expect(d!.last100).toBe(100)
    expect(d!.prev100).toBeNull()
    expect(d!.deltaPct).toBeNull()
  })

  it('prev100 computes over a short (≥50) previous window', () => {
    // 160 answers → prev window = oldest 60 at 50%, last 100 at 100%.
    const d = computeImprovement(newestFirst([...run(60, 30), ...run(100, 100)]))
    expect(d!.prev100).toBe(50)
    expect(d!.last100).toBe(100)
    expect(d!.deltaPct).toBe(50)
  })

  it('rounds block accuracy to a whole percent', () => {
    // 21-answer partial block, 7 correct → 33.33% → 33.
    const d = computeImprovement(newestFirst(run(21, 7)))
    expect(d!.blocks).toEqual([{ accuracy: 33, n: 21 }])
  })

  it('tolerates null answered_at (sorted oldest, never crashes)', () => {
    const rows = newestFirst([...run(50, 0), ...run(50, 50)])
    rows[rows.length - 1] = { correct: false, answered_at: null }
    const d = computeImprovement(rows)
    expect(d).not.toBeNull()
    expect(d!.blocks).toHaveLength(2)
  })
})
