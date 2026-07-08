import { describe, it, expect } from 'vitest'
import {
  aggregatePacing,
  EXAM_BUDGET_MS,
  type PacingRow,
} from '../pacing-server'

function row(overrides: Partial<PacingRow> = {}): PacingRow {
  return {
    question_id: 'q1',
    correct: true,
    answered_at: '2026-07-08T10:00:00.000Z',
    time_ms: 30_000,
    ...overrides,
  }
}

const NO_TOPICS = new Map<string, string | null>()

describe('aggregatePacing', () => {
  it('returns null when there are no rows', () => {
    expect(aggregatePacing([], NO_TOPICS)).toBeNull()
  })

  it('returns null when every row fails the sanity filter', () => {
    const rows = [
      row({ time_ms: 499 }), // mis-tap
      row({ time_ms: 600_001 }), // left-open tab
      row({ time_ms: null }),
    ]
    expect(aggregatePacing(rows, NO_TOPICS)).toBeNull()
  })

  it('computes overall average over sane rows only, with the exam budget', () => {
    const rows = [
      row({ time_ms: 20_000 }),
      row({ time_ms: 40_000 }),
      row({ time_ms: 100 }), // excluded: below 500ms
      row({ time_ms: 700_000 }), // excluded: above 10min
    ]
    const p = aggregatePacing(rows, NO_TOPICS)
    expect(p).not.toBeNull()
    expect(p!.sampleSize).toBe(2)
    expect(p!.avgMs).toBe(30_000)
    expect(p!.examBudgetMs).toBe(EXAM_BUDGET_MS)
    expect(EXAM_BUDGET_MS).toBe(72_000)
  })

  it('rounds the average to a whole ms', () => {
    const rows = [row({ time_ms: 1_000 }), row({ time_ms: 2_001 })]
    const p = aggregatePacing(rows, NO_TOPICS)
    expect(p!.avgMs).toBe(1501) // 1500.5 rounds up
  })

  it('builds a per-day trend oldest→newest and caps at 10 active days', () => {
    const rows: PacingRow[] = []
    // 12 active days, 2 rows each (input newest-first, like the query)
    for (let d = 12; d >= 1; d--) {
      const date = `2026-06-${String(d).padStart(2, '0')}`
      rows.push(row({ answered_at: `${date}T09:00:00.000Z`, time_ms: d * 1_000 }))
      rows.push(row({ answered_at: `${date}T10:00:00.000Z`, time_ms: d * 3_000 }))
    }
    const p = aggregatePacing(rows, NO_TOPICS)
    expect(p!.trend).toHaveLength(10)
    // Oldest two days (06-01, 06-02) dropped
    expect(p!.trend[0]).toEqual({ date: '2026-06-03', avgMs: 6_000, n: 2 })
    expect(p!.trend[9]).toEqual({ date: '2026-06-12', avgMs: 24_000, n: 2 })
    const dates = p!.trend.map((t) => t.date)
    expect([...dates].sort()).toEqual(dates) // ascending
  })

  it('skips rows with unparseable timestamps in the trend but not the average', () => {
    const rows = [
      row({ answered_at: null, time_ms: 10_000 }),
      row({ answered_at: '2026-07-01T00:00:00Z', time_ms: 30_000 }),
    ]
    const p = aggregatePacing(rows, NO_TOPICS)
    expect(p!.sampleSize).toBe(2)
    expect(p!.avgMs).toBe(20_000)
    expect(p!.trend).toEqual([{ date: '2026-07-01', avgMs: 30_000, n: 1 }])
  })

  describe('slowTopics', () => {
    const topics = new Map<string, string | null>([
      ['q-slow', 'sub-slow'],
      ['q-fast', 'sub-fast'],
      ['q-rare', 'sub-rare'],
      ['q-none', null],
    ])

    it('requires ≥3 timed attempts, sorts slowest first, computes errorRate', () => {
      const rows = [
        // sub-slow: 3 attempts, avg 60s, 2 wrong
        row({ question_id: 'q-slow', time_ms: 50_000, correct: false }),
        row({ question_id: 'q-slow', time_ms: 60_000, correct: false }),
        row({ question_id: 'q-slow', time_ms: 70_000, correct: true }),
        // sub-fast: 3 attempts, avg 10s, 0 wrong
        row({ question_id: 'q-fast', time_ms: 10_000 }),
        row({ question_id: 'q-fast', time_ms: 10_000 }),
        row({ question_id: 'q-fast', time_ms: 10_000 }),
        // sub-rare: only 2 attempts → excluded
        row({ question_id: 'q-rare', time_ms: 90_000 }),
        row({ question_id: 'q-rare', time_ms: 90_000 }),
        // null subtopic → never grouped
        row({ question_id: 'q-none', time_ms: 90_000 }),
        // unknown question id → never grouped
        row({ question_id: 'q-unknown', time_ms: 90_000 }),
      ]
      const p = aggregatePacing(rows, topics)
      expect(p!.slowTopics).toEqual([
        { subtopic_id: 'sub-slow', avgMs: 60_000, attempts: 3, errorRate: 2 / 3 },
        { subtopic_id: 'sub-fast', avgMs: 10_000, attempts: 3, errorRate: 0 },
      ])
    })

    it('caps at 6 topics', () => {
      const map = new Map<string, string | null>()
      const rows: PacingRow[] = []
      for (let i = 0; i < 8; i++) {
        map.set(`q${i}`, `sub${i}`)
        for (let a = 0; a < 3; a++) {
          rows.push(row({ question_id: `q${i}`, time_ms: (i + 1) * 1_000 }))
        }
      }
      const p = aggregatePacing(rows, map)
      expect(p!.slowTopics).toHaveLength(6)
      // slowest (sub7) first, cut after 6 (sub1/sub0 dropped)
      expect(p!.slowTopics[0].subtopic_id).toBe('sub7')
      expect(p!.slowTopics[5].subtopic_id).toBe('sub2')
    })

    it('is empty when no subtopic map is provided (dashboard variant)', () => {
      const p = aggregatePacing([row(), row(), row()], NO_TOPICS)
      expect(p!.slowTopics).toEqual([])
    })
  })
})
