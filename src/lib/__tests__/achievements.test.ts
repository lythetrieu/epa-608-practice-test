import { describe, it, expect } from 'vitest'
import {
  computeAchievements,
  computeCurrentStreak,
  countDistinctQuestions,
  countFixedQuestions,
  BADGE_IDS,
  RANKS,
  FULL_BANK_SIZE,
  type AchievementInputs,
  type Achievements,
  type BadgeId,
} from '../achievements-server'
import { EXAM_BUDGET_MS } from '../pacing-server'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseInputs(overrides: Partial<AchievementInputs> = {}): AchievementInputs {
  return {
    correctCount: 0,
    wrongCount: 0,
    completedTests: 0,
    masteredLevels: 0,
    sessions: [],
    readiness: null,
    currentStreak: 0,
    hasPerfectLevel: false,
    distinctQuestionsAnswered: 0,
    pacing: null,
    fixedCount: 0,
    ...overrides,
  }
}

const SECTIONS = ['Core', 'Type I', 'Type II', 'Type III'] as const

/** Readiness stub: the listed categories are ready, the rest are not. */
function readiness(readyCats: string[]) {
  return {
    byCategory: SECTIONS.map(category => ({
      category,
      ready: readyCats.includes(category),
    })),
  }
}

function badge(a: Achievements, id: BadgeId): boolean {
  const b = a.badges.find(x => x.id === id)
  if (!b) throw new Error(`badge ${id} missing from payload`)
  return b.unlocked
}

/** A session that satisfies every boss-down criterion, before overrides. */
function bossSession(overrides: Partial<AchievementInputs['sessions'][number]> = {}) {
  return {
    category: 'Core',
    score: 18, // 18/25 = 72%
    total: 25,
    time_limit_secs: 1800,
    submitted_at: '2026-07-08T10:00:00.000Z',
    ...overrides,
  }
}

// ─── XP formula ──────────────────────────────────────────────────────────────

describe('computeAchievements — XP', () => {
  it('is 0 with no activity', () => {
    expect(computeAchievements(baseInputs()).xp).toBe(0)
  })

  it('applies 10/correct + 3/wrong + 50/test + 100/level', () => {
    const a = computeAchievements(
      baseInputs({ correctCount: 7, wrongCount: 5, completedTests: 3, masteredLevels: 2 }),
    )
    expect(a.xp).toBe(7 * 10 + 5 * 3 + 3 * 50 + 2 * 100) // 70+15+150+200 = 435
  })

  it('counts wrong answers (effort) but less than correct ones', () => {
    const wrongOnly = computeAchievements(baseInputs({ wrongCount: 10 }))
    const correctOnly = computeAchievements(baseInputs({ correctCount: 10 }))
    expect(wrongOnly.xp).toBe(30)
    expect(correctOnly.xp).toBe(100)
  })

  it('clamps negative inputs to 0 instead of producing negative XP', () => {
    const a = computeAchievements(baseInputs({ correctCount: -5, wrongCount: -1 }))
    expect(a.xp).toBe(0)
  })
})

// ─── Rank thresholds ─────────────────────────────────────────────────────────

describe('computeAchievements — rank', () => {
  it('pins the 0/500/1500/3500/7000 ladder', () => {
    expect(RANKS.map(r => r.minXp)).toEqual([0, 500, 1500, 3500, 7000])
  })

  // Exact-XP recipes: 10×correct + 3×wrong lets us hit any target
  // (n mod 10 covered by wrongCount multiples of 3: 499 = 49×10 + 3×3).
  const cases: [number, Partial<AchievementInputs>, string, number | null][] = [
    [0, {}, 'apprentice', 500],
    [499, { correctCount: 49, wrongCount: 3 }, 'apprentice', 500],
    [500, { correctCount: 50 }, 'tech-in-training', 1500],
    [1499, { correctCount: 149, wrongCount: 3 }, 'tech-in-training', 1500],
    [1500, { correctCount: 150 }, 'journeyman', 3500],
    [3499, { correctCount: 349, wrongCount: 3 }, 'journeyman', 3500],
    [3500, { correctCount: 350 }, 'senior-tech', 7000],
    [6999, { correctCount: 699, wrongCount: 3 }, 'senior-tech', 7000],
    [7000, { correctCount: 700 }, 'master-tech', null],
    [99999, { correctCount: 9999, wrongCount: 3 }, 'master-tech', null],
  ]

  it.each(cases)('xp=%i → %s', (xp, overrides, rankId, nextMinXp) => {
    const a = computeAchievements(baseInputs(overrides))
    expect(a.xp).toBe(xp)
    expect(a.rank.id).toBe(rankId)
    expect(a.rank.nextMinXp).toBe(nextMinXp)
    const def = RANKS.find(r => r.id === rankId)!
    expect(a.rank.minXp).toBe(def.minXp)
    expect(a.rank.label).toBe(def.label)
  })
})

// ─── Badge payload shape ─────────────────────────────────────────────────────

describe('computeAchievements — badge payload', () => {
  it('always returns every badge id, locked or not, in stable order', () => {
    const a = computeAchievements(baseInputs())
    expect(a.badges.map(b => b.id)).toEqual([...BADGE_IDS])
    expect(a.badges.every(b => b.unlocked === false)).toBe(true)
  })
})

// ─── Section readiness badges ────────────────────────────────────────────────

describe('computeAchievements — *-ready badges', () => {
  it('unlocks each section badge from readiness.byCategory.ready', () => {
    const a = computeAchievements(
      baseInputs({ readiness: readiness(['Core', 'Type II']) }),
    )
    expect(badge(a, 'core-ready')).toBe(true)
    expect(badge(a, 'type1-ready')).toBe(false)
    expect(badge(a, 'type2-ready')).toBe(true)
    expect(badge(a, 'type3-ready')).toBe(false)
    expect(badge(a, 'universal-ready')).toBe(false)
  })

  it('universal-ready requires ALL four sections ready', () => {
    const three = computeAchievements(
      baseInputs({ readiness: readiness(['Core', 'Type I', 'Type II']) }),
    )
    expect(badge(three, 'universal-ready')).toBe(false)

    const four = computeAchievements(
      baseInputs({ readiness: readiness(['Core', 'Type I', 'Type II', 'Type III']) }),
    )
    expect(badge(four, 'universal-ready')).toBe(true)
  })

  it('a Universal readiness entry alone unlocks nothing (sections only)', () => {
    const a = computeAchievements(
      baseInputs({ readiness: { byCategory: [{ category: 'Universal', ready: true }] } }),
    )
    for (const id of ['core-ready', 'type1-ready', 'type2-ready', 'type3-ready', 'universal-ready'] as const) {
      expect(badge(a, id)).toBe(false)
    }
  })

  it('null readiness (not enough data) locks all section badges', () => {
    const a = computeAchievements(baseInputs({ readiness: null }))
    expect(badge(a, 'core-ready')).toBe(false)
    expect(badge(a, 'universal-ready')).toBe(false)
  })
})

// ─── boss-down ───────────────────────────────────────────────────────────────

describe('computeAchievements — boss-down', () => {
  it('unlocks on a timed 25Q section exam at exactly 72%', () => {
    const a = computeAchievements(baseInputs({ sessions: [bossSession()] }))
    expect(badge(a, 'boss-down')).toBe(true)
  })

  it('accepts bigger passes and any of the four sections', () => {
    const a = computeAchievements(
      baseInputs({ sessions: [bossSession({ category: 'Type III', score: 30, total: 30 })] }),
    )
    expect(badge(a, 'boss-down')).toBe(true)
  })

  const lockedCases: [string, Partial<ReturnType<typeof bossSession>>][] = [
    ['score below 72% (17/25)', { score: 17 }],
    ['fewer than 25 questions', { score: 18, total: 24 }],
    ['untimed (time_limit_secs = 0 sentinel)', { time_limit_secs: 0 }],
    ['untimed (time_limit_secs null)', { time_limit_secs: null }],
    ['non-section category', { category: 'Universal' }],
    ['unscored session', { score: null }],
  ]

  it.each(lockedCases)('stays locked when %s', (_label, overrides) => {
    const a = computeAchievements(baseInputs({ sessions: [bossSession(overrides)] }))
    expect(badge(a, 'boss-down')).toBe(false)
  })

  it('one qualifying session among failures is enough', () => {
    const a = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 10 }), bossSession()] }),
    )
    expect(badge(a, 'boss-down')).toBe(true)
  })
})

// ─── perfect-10 / streaks / full-bank / beat-the-clock / fixer ──────────────

describe('computeAchievements — remaining badges', () => {
  it('perfect-10 mirrors hasPerfectLevel', () => {
    expect(badge(computeAchievements(baseInputs({ hasPerfectLevel: true })), 'perfect-10')).toBe(true)
    expect(badge(computeAchievements(baseInputs({ hasPerfectLevel: false })), 'perfect-10')).toBe(false)
  })

  it.each([
    [0, false, false, false],
    [2, false, false, false],
    [3, true, false, false],
    [6, true, false, false],
    [7, true, true, false],
    [13, true, true, false],
    [14, true, true, true],
    [100, true, true, true],
  ])('streak %i → streak-3=%s streak-7=%s streak-14=%s', (streak, s3, s7, s14) => {
    const a = computeAchievements(baseInputs({ currentStreak: streak }))
    expect(badge(a, 'streak-3')).toBe(s3)
    expect(badge(a, 'streak-7')).toBe(s7)
    expect(badge(a, 'streak-14')).toBe(s14)
  })

  it('full-bank unlocks at exactly the bank size', () => {
    expect(FULL_BANK_SIZE).toBe(569)
    const under = computeAchievements(baseInputs({ distinctQuestionsAnswered: 568 }))
    const at = computeAchievements(baseInputs({ distinctQuestionsAnswered: 569 }))
    expect(badge(under, 'full-bank')).toBe(false)
    expect(badge(at, 'full-bank')).toBe(true)
  })

  it('beat-the-clock needs avgMs ≤ 72s over ≥25 timed answers', () => {
    expect(EXAM_BUDGET_MS).toBe(72_000)
    const ok = computeAchievements(
      baseInputs({ pacing: { avgMs: EXAM_BUDGET_MS, sampleSize: 25 } }),
    )
    expect(badge(ok, 'beat-the-clock')).toBe(true)

    const tooSlow = computeAchievements(
      baseInputs({ pacing: { avgMs: EXAM_BUDGET_MS + 1, sampleSize: 200 } }),
    )
    expect(badge(tooSlow, 'beat-the-clock')).toBe(false)

    const tooFew = computeAchievements(
      baseInputs({ pacing: { avgMs: 30_000, sampleSize: 24 } }),
    )
    expect(badge(tooFew, 'beat-the-clock')).toBe(false)

    const noData = computeAchievements(baseInputs({ pacing: null }))
    expect(badge(noData, 'beat-the-clock')).toBe(false)
  })

  it('fixer unlocks at 10 fixed questions', () => {
    expect(badge(computeAchievements(baseInputs({ fixedCount: 9 })), 'fixer')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ fixedCount: 10 })), 'fixer')).toBe(true)
  })

  it('a fully-loaded account unlocks all badges at once', () => {
    const a = computeAchievements(
      baseInputs({
        correctCount: 700,
        readiness: readiness([...SECTIONS]),
        sessions: [bossSession()],
        hasPerfectLevel: true,
        currentStreak: 14,
        distinctQuestionsAnswered: FULL_BANK_SIZE,
        pacing: { avgMs: 60_000, sampleSize: 100 },
        fixedCount: 12,
      }),
    )
    expect(a.badges.every(b => b.unlocked)).toBe(true)
    expect(a.rank.id).toBe('master-tech')
  })
})

// ─── countDistinctQuestions ──────────────────────────────────────────────────

describe('countDistinctQuestions', () => {
  it('counts distinct ids, not rows', () => {
    const rows = [
      { question_id: 'q1' },
      { question_id: 'q2' },
      { question_id: 'q1' },
      { question_id: 'q3' },
      { question_id: 'q2' },
    ]
    expect(countDistinctQuestions(rows)).toBe(3)
  })

  it('is 0 for an empty window', () => {
    expect(countDistinctQuestions([])).toBe(0)
  })
})

// ─── countFixedQuestions (reuses aggregateMistakes; rows newest-first) ──────

describe('countFixedQuestions', () => {
  it('counts questions whose latest attempt is correct after an earlier wrong one', () => {
    const rows = [
      // q1: newest correct, older wrong → FIXED
      { question_id: 'q1', correct: true },
      { question_id: 'q1', correct: false },
      // q2: newest wrong → still failing, not fixed
      { question_id: 'q2', correct: false },
      { question_id: 'q2', correct: true },
      // q3: never wrong → not fixed
      { question_id: 'q3', correct: true },
    ]
    expect(countFixedQuestions(rows)).toBe(1)
  })

  it('needs at least one wrong attempt somewhere (all-correct → 0)', () => {
    expect(
      countFixedQuestions([
        { question_id: 'q1', correct: true },
        { question_id: 'q2', correct: true },
      ]),
    ).toBe(0)
  })

  it('is 0 for an empty window', () => {
    expect(countFixedQuestions([])).toBe(0)
  })

  it('feeds the fixer badge end-to-end at the 10-question threshold', () => {
    const rows: { question_id: string; correct: boolean }[] = []
    for (let i = 0; i < 10; i++) {
      rows.push({ question_id: `q${i}`, correct: true }) // newest: fixed
      rows.push({ question_id: `q${i}`, correct: false })
    }
    const fixedCount = countFixedQuestions(rows)
    expect(fixedCount).toBe(10)
    expect(badge(computeAchievements(baseInputs({ fixedCount })), 'fixer')).toBe(true)
  })
})

// ─── computeCurrentStreak (extracted from dashboard-data) ────────────────────

describe('computeCurrentStreak', () => {
  // Fixed "now"; day strings are derived with the SAME local-midnight →
  // UTC-date-string quirk the implementation (and old dashboard code) uses,
  // so these tests are timezone-robust.
  const NOW = new Date('2026-07-10T15:30:00')

  function dayStr(offset: number): string {
    const d = new Date(NOW)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - offset)
    return d.toISOString().slice(0, 10)
  }

  function session(offset: number, field: 'submitted_at' | 'started_at' = 'submitted_at') {
    return { [field]: `${dayStr(offset)}T00:00:00.000Z` }
  }

  it('is 0 with no sessions', () => {
    expect(computeCurrentStreak([], NOW)).toBe(0)
  })

  it('counts consecutive days ending today', () => {
    expect(computeCurrentStreak([session(0)], NOW)).toBe(1)
    expect(computeCurrentStreak([session(0), session(1), session(2)], NOW)).toBe(3)
  })

  it('stops at the first gap', () => {
    expect(computeCurrentStreak([session(0), session(2), session(3)], NOW)).toBe(1)
  })

  it("grants yesterday-grace: a streak that hasn't practiced today yet still counts", () => {
    expect(computeCurrentStreak([session(1), session(2)], NOW)).toBe(2)
  })

  it('is 0 when the last practice was 2+ days ago', () => {
    expect(computeCurrentStreak([session(2), session(3)], NOW)).toBe(0)
  })

  it('counts started_at days too, and dedupes same-day sessions', () => {
    expect(
      computeCurrentStreak(
        [session(0, 'started_at'), session(0), session(1, 'started_at')],
        NOW,
      ),
    ).toBe(2)
  })
})
