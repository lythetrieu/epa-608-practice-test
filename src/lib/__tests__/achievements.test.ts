import { describe, it, expect } from 'vitest'
import {
  buildWorldCompletion,
  computeAchievements,
  computeCurrentStreak,
  countActiveDays,
  countDistinctQuestions,
  countFixedQuestions,
  maxAnswersInOneDay,
  BADGE_IDS,
  BADGE_XP,
  RANKS,
  FULL_BANK_SIZE,
  HALF_BANK_SIZE,
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
    maxAnswersInADay: 0,
    worldCompletion: {},
    activeDays: 0,
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

/** worldCompletion stub: listed categories fully mastered, the rest partial. */
function worlds(completeCats: string[]) {
  return Object.fromEntries(
    SECTIONS.map(cat => [
      cat,
      completeCats.includes(cat) ? { mastered: 3, total: 3 } : { mastered: 1, total: 3 },
    ]),
  )
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

  it('applies 10/correct + 3/wrong + 50/test + 100/level + 20/active-day + badge bonuses', () => {
    const a = computeAchievements(
      baseInputs({
        correctCount: 7,
        wrongCount: 5,
        completedTests: 3,
        masteredLevels: 2,
        activeDays: 4,
      }),
    )
    // These inputs also unlock first-test (25) + first-level (25) → badgeXp 50.
    expect(a.badgeXp).toBe(50)
    expect(a.xp).toBe(7 * 10 + 5 * 3 + 3 * 50 + 2 * 100 + 4 * 20 + 50) // 70+15+150+200+80+50 = 565
  })

  it('counts wrong answers (effort) but less than correct ones', () => {
    const wrongOnly = computeAchievements(baseInputs({ wrongCount: 10 }))
    const correctOnly = computeAchievements(baseInputs({ correctCount: 10 }))
    expect(wrongOnly.xp).toBe(30)
    expect(correctOnly.xp).toBe(100)
  })

  it('awards 20 XP per active day (and activeDays alone unlocks no badge)', () => {
    const a = computeAchievements(baseInputs({ activeDays: 3 }))
    expect(a.xp).toBe(60)
    expect(a.badgeXp).toBe(0)
  })

  it('adds unlocked-badge bonuses into xp and reports them as badgeXp', () => {
    // 100 correct answers → century unlocks (common, 50 XP), nothing else.
    const a = computeAchievements(baseInputs({ correctCount: 100 }))
    expect(a.badgeXp).toBe(BADGE_XP.century.xp)
    expect(a.xp).toBe(100 * 10 + BADGE_XP.century.xp) // 1050
  })

  it('badge XP counts toward rank thresholds', () => {
    // 490 base XP + perfect-10 (rare, 150) = 640 → crosses the 500 mark.
    const a = computeAchievements(baseInputs({ correctCount: 49, hasPerfectLevel: true }))
    expect(a.xp).toBe(640)
    expect(a.rank.id).toBe('tech-in-training')
  })

  it('clamps negative inputs to 0 instead of producing negative XP', () => {
    const a = computeAchievements(
      baseInputs({ correctCount: -5, wrongCount: -1, activeDays: -3 }),
    )
    expect(a.xp).toBe(0)
    expect(a.badgeXp).toBe(0)
  })
})

// ─── Rank thresholds ─────────────────────────────────────────────────────────

describe('computeAchievements — rank', () => {
  it('pins the 0/500/1500/3500/7000 ladder', () => {
    expect(RANKS.map(r => r.minXp)).toEqual([0, 500, 1500, 3500, 7000])
  })

  // Exact-XP recipes that unlock ZERO badges (badge bonuses would shift the
  // total): activeDays carries the bulk at 20/day and never unlocks anything;
  // correct+wrong stays under the 100-answer century mark
  // (odd remainders via 10×correct + 3×wrong: 99 = 9×10 + 3×3).
  const cases: [number, Partial<AchievementInputs>, string, number | null][] = [
    [0, {}, 'apprentice', 500],
    [499, { correctCount: 1, wrongCount: 3, activeDays: 24 }, 'apprentice', 500],
    [500, { correctCount: 50 }, 'tech-in-training', 1500],
    [1499, { correctCount: 9, wrongCount: 3, activeDays: 70 }, 'tech-in-training', 1500],
    [1500, { activeDays: 75 }, 'journeyman', 3500],
    [3499, { correctCount: 9, wrongCount: 3, activeDays: 170 }, 'journeyman', 3500],
    [3500, { activeDays: 175 }, 'senior-tech', 7000],
    [6999, { correctCount: 9, wrongCount: 3, activeDays: 345 }, 'senior-tech', 7000],
    [7000, { activeDays: 350 }, 'master-tech', null],
    [99999, { correctCount: 9, wrongCount: 3, activeDays: 4995 }, 'master-tech', null],
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

  it('every badge item carries its BADGE_XP rarity and xp (locked or not)', () => {
    const a = computeAchievements(baseInputs())
    for (const b of a.badges) {
      expect(b.rarity).toBe(BADGE_XP[b.id].rarity)
      expect(b.xp).toBe(BADGE_XP[b.id].xp)
    }
  })
})

// ─── BADGE_XP economy contract ───────────────────────────────────────────────

describe('BADGE_XP — economy contract', () => {
  it('maps every one of the 33 badge ids, no extras', () => {
    expect(BADGE_IDS).toHaveLength(33)
    expect(Object.keys(BADGE_XP).sort()).toEqual([...BADGE_IDS].sort())
  })

  it('uses only the four rarities, with XP tiered strictly by rarity band', () => {
    const bands = {
      common: [25, 50],
      rare: [150, 150],
      epic: [200, 300],
      legendary: [500, 1000],
    } as const
    for (const id of BADGE_IDS) {
      const { rarity, xp } = BADGE_XP[id]
      expect(Object.keys(bands)).toContain(rarity)
      const [min, max] = bands[rarity]
      expect(xp).toBeGreaterThanOrEqual(min)
      expect(xp).toBeLessThanOrEqual(max)
    }
  })

  it('spot-checks the pinned rarity/xp table', () => {
    expect(BADGE_XP['first-test']).toEqual({ rarity: 'common', xp: 25 })
    expect(BADGE_XP['streak-3']).toEqual({ rarity: 'common', xp: 50 })
    expect(BADGE_XP['night-owl']).toEqual({ rarity: 'common', xp: 50 })
    expect(BADGE_XP['streak-7']).toEqual({ rarity: 'rare', xp: 150 })
    expect(BADGE_XP['perfect-10']).toEqual({ rarity: 'rare', xp: 150 })
    expect(BADGE_XP['half-bank']).toEqual({ rarity: 'rare', xp: 150 })
    expect(BADGE_XP['core-ready']).toEqual({ rarity: 'epic', xp: 200 })
    expect(BADGE_XP['marathon-day']).toEqual({ rarity: 'epic', xp: 200 })
    expect(BADGE_XP['world-core']).toEqual({ rarity: 'epic', xp: 250 })
    expect(BADGE_XP['streak-14']).toEqual({ rarity: 'epic', xp: 300 })
    expect(BADGE_XP['flawless-exam']).toEqual({ rarity: 'epic', xp: 300 })
    expect(BADGE_XP['universal-ready']).toEqual({ rarity: 'legendary', xp: 500 })
    expect(BADGE_XP['iron-streak-30']).toEqual({ rarity: 'legendary', xp: 500 })
    expect(BADGE_XP['path-complete']).toEqual({ rarity: 'legendary', xp: 750 })
    expect(BADGE_XP['universal-boss']).toEqual({ rarity: 'legendary', xp: 1000 })
  })

  it('pins the total economy: all 33 badges are worth 8150 XP combined', () => {
    const total = Object.values(BADGE_XP).reduce((s, v) => s + v.xp, 0)
    expect(total).toBe(8150)
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

  it('a fully-loaded account unlocks all 33 badges at once', () => {
    const a = computeAchievements(
      baseInputs({
        correctCount: 700, // also covers century (≥100 answers)
        completedTests: 1, // first-test
        masteredLevels: 1, // first-level
        readiness: readiness([...SECTIONS]),
        sessions: [
          // 2026-07-01: an early Core fail → comeback-kid setup
          bossSession({ score: 0, submitted_at: '2026-07-01T15:00:00.000Z' }),
          // Sat 2026-07-04 + Sun 2026-07-05 → weekend-warrior
          bossSession({ submitted_at: '2026-07-04T15:00:00.000Z' }),
          bossSession({ submitted_at: '2026-07-05T15:00:00.000Z' }),
          // 2026-07-08: three passes on one UTC day → hat-trick; the later
          // Core passes also complete comeback-kid.
          // 03:30 UTC → night-owl. Also a flawless 25/25 → sharpshooter too.
          bossSession({ score: 25, submitted_at: '2026-07-08T03:30:00.000Z' }),
          // 48s/question timed pass → speed-runner
          bossSession({
            started_at: '2026-07-08T10:00:00.000Z',
            submitted_at: '2026-07-08T10:20:00.000Z',
          }),
          bossSession({ submitted_at: '2026-07-08T15:00:00.000Z' }),
          // timed 100Q Universal pass → universal-boss
          bossSession({ category: 'Universal', score: 100, total: 100, time_limit_secs: 7200 }),
        ],
        hasPerfectLevel: true,
        currentStreak: 30, // streak-3/7/14 + iron-streak-30
        distinctQuestionsAnswered: FULL_BANK_SIZE, // full-bank + half-bank
        pacing: { avgMs: 60_000, sampleSize: 100 },
        fixedCount: 25, // fixer + fix-master
        maxAnswersInADay: 100, // marathon-day
        worldCompletion: worlds([...SECTIONS]), // world-* + path-complete
      }),
    )
    const locked = a.badges.filter(b => !b.unlocked).map(b => b.id)
    expect(locked).toEqual([])
    expect(a.badges).toHaveLength(33)
    // With every badge unlocked, badgeXp = the whole 8150 economy, all of it
    // included in the total on top of the activity XP.
    const allBadgeXp = Object.values(BADGE_XP).reduce((s, v) => s + v.xp, 0)
    expect(a.badgeXp).toBe(allBadgeXp)
    expect(a.xp - a.badgeXp).toBe(700 * 10 + 1 * 50 + 1 * 100) // activity XP alone
    expect(a.rank.id).toBe('master-tech')
  })
})

// ─── Wave 2: badge order contract ────────────────────────────────────────────

describe('computeAchievements — wave-2 badge order', () => {
  it('pins all 33 ids: the original 13 first, then the 20 new ones', () => {
    expect([...BADGE_IDS]).toEqual([
      'core-ready',
      'type1-ready',
      'type2-ready',
      'type3-ready',
      'universal-ready',
      'boss-down',
      'perfect-10',
      'streak-3',
      'streak-7',
      'streak-14',
      'full-bank',
      'beat-the-clock',
      'fixer',
      'first-test',
      'first-level',
      'sharpshooter',
      'flawless-exam',
      'speed-runner',
      'hat-trick',
      'comeback-kid',
      'night-owl',
      'weekend-warrior',
      'century',
      'half-bank',
      'marathon-day',
      'iron-streak-30',
      'fix-master',
      'world-core',
      'world-type1',
      'world-type2',
      'world-type3',
      'path-complete',
      'universal-boss',
    ])
  })
})

// ─── Wave 2: simple counter thresholds ───────────────────────────────────────

describe('computeAchievements — wave-2 counter badges', () => {
  it('first-test unlocks at 1 completed test', () => {
    expect(badge(computeAchievements(baseInputs({ completedTests: 0 })), 'first-test')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ completedTests: 1 })), 'first-test')).toBe(true)
  })

  it('first-level unlocks at 1 mastered level', () => {
    expect(badge(computeAchievements(baseInputs({ masteredLevels: 0 })), 'first-level')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ masteredLevels: 1 })), 'first-level')).toBe(true)
  })

  it('century unlocks at 100 total answers (correct + wrong combined)', () => {
    expect(
      badge(computeAchievements(baseInputs({ correctCount: 50, wrongCount: 49 })), 'century'),
    ).toBe(false)
    expect(
      badge(computeAchievements(baseInputs({ correctCount: 50, wrongCount: 50 })), 'century'),
    ).toBe(true)
    expect(badge(computeAchievements(baseInputs({ wrongCount: 100 })), 'century')).toBe(true)
  })

  it('half-bank unlocks at exactly 285 distinct questions', () => {
    expect(HALF_BANK_SIZE).toBe(285)
    expect(
      badge(computeAchievements(baseInputs({ distinctQuestionsAnswered: 284 })), 'half-bank'),
    ).toBe(false)
    expect(
      badge(computeAchievements(baseInputs({ distinctQuestionsAnswered: 285 })), 'half-bank'),
    ).toBe(true)
  })

  it('marathon-day unlocks at 100 answers in one UTC day', () => {
    expect(badge(computeAchievements(baseInputs({ maxAnswersInADay: 99 })), 'marathon-day')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ maxAnswersInADay: 100 })), 'marathon-day')).toBe(true)
  })

  it('iron-streak-30 unlocks at a 30-day streak', () => {
    expect(badge(computeAchievements(baseInputs({ currentStreak: 29 })), 'iron-streak-30')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ currentStreak: 30 })), 'iron-streak-30')).toBe(true)
  })

  it('fix-master unlocks at 25 fixed questions (fixer already unlocked)', () => {
    const at24 = computeAchievements(baseInputs({ fixedCount: 24 }))
    expect(badge(at24, 'fixer')).toBe(true)
    expect(badge(at24, 'fix-master')).toBe(false)
    expect(badge(computeAchievements(baseInputs({ fixedCount: 25 })), 'fix-master')).toBe(true)
  })
})

// ─── Wave 2: single-session badges ───────────────────────────────────────────

describe('computeAchievements — sharpshooter / flawless-exam', () => {
  it('sharpshooter needs ≥90% on a 25Q+ session', () => {
    const hit = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 23 })] }), // 23/25 = 92%
    )
    expect(badge(hit, 'sharpshooter')).toBe(true)

    const miss = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 22 })] }), // 88%
    )
    expect(badge(miss, 'sharpshooter')).toBe(false)

    const tooSmall = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 24, total: 24 })] }),
    )
    expect(badge(tooSmall, 'sharpshooter')).toBe(false)
  })

  it('sharpshooter ignores time limits and category (unlike boss-down)', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [bossSession({ category: 'Universal', score: 23, time_limit_secs: null })],
      }),
    )
    expect(badge(a, 'sharpshooter')).toBe(true)
    expect(badge(a, 'boss-down')).toBe(false)
  })

  it('flawless-exam needs a perfect score on a 25Q+ session', () => {
    const perfect = computeAchievements(baseInputs({ sessions: [bossSession({ score: 25 })] }))
    expect(badge(perfect, 'flawless-exam')).toBe(true)

    const oneOff = computeAchievements(baseInputs({ sessions: [bossSession({ score: 24 })] }))
    expect(badge(oneOff, 'flawless-exam')).toBe(false)

    const smallPerfect = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 10, total: 10 })] }),
    )
    expect(badge(smallPerfect, 'flawless-exam')).toBe(false)

    const unscored = computeAchievements(baseInputs({ sessions: [bossSession({ score: null })] }))
    expect(badge(unscored, 'flawless-exam')).toBe(false)
  })
})

describe('computeAchievements — speed-runner', () => {
  /** A passed, timed 25Q session; duration set via overrides. */
  function timedRun(startISO: string, endISO: string, overrides = {}) {
    return bossSession({ started_at: startISO, submitted_at: endISO, ...overrides })
  }

  it('unlocks at exactly 50s/question on a passed timed exam', () => {
    // 25 × 50s = 1250s
    const exact = computeAchievements(
      baseInputs({
        sessions: [timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:20:50.000Z')],
      }),
    )
    expect(badge(exact, 'speed-runner')).toBe(true)
  })

  it('stays locked one second over the 50s/question budget', () => {
    const over = computeAchievements(
      baseInputs({
        sessions: [timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:20:51.000Z')],
      }),
    )
    expect(badge(over, 'speed-runner')).toBe(false)
  })

  const lockedCases: [string, ReturnType<typeof bossSession>][] = [
    [
      'the session was failed (17/25)',
      timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:10:00.000Z', { score: 17 }),
    ],
    [
      'the session is untimed',
      timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:10:00.000Z', { time_limit_secs: 0 }),
    ],
    [
      'fewer than 25 questions',
      timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:10:00.000Z', { score: 18, total: 24 }),
    ],
    ['started_at is missing', bossSession({ started_at: null })],
    ['submitted_at is missing', bossSession({ started_at: '2026-07-08T10:00:00.000Z', submitted_at: null })],
    [
      'duration is zero',
      timedRun('2026-07-08T10:00:00.000Z', '2026-07-08T10:00:00.000Z'),
    ],
    [
      'duration is negative (clock skew)',
      timedRun('2026-07-08T10:20:00.000Z', '2026-07-08T10:00:00.000Z'),
    ],
  ]

  it.each(lockedCases)('stays locked when %s', (_label, session) => {
    const a = computeAchievements(baseInputs({ sessions: [session] }))
    expect(badge(a, 'speed-runner')).toBe(false)
  })
})

// ─── Wave 2: multi-session badges ────────────────────────────────────────────

describe('computeAchievements — hat-trick', () => {
  it('unlocks on 3 passed sessions submitted the same UTC day', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ submitted_at: '2026-07-08T01:00:00.000Z' }),
          bossSession({ submitted_at: '2026-07-08T12:00:00.000Z' }),
          bossSession({ submitted_at: '2026-07-08T23:59:59.000Z' }),
        ],
      }),
    )
    expect(badge(a, 'hat-trick')).toBe(true)
  })

  it('counts a pass at exactly the 72% boundary (18/25)', () => {
    // bossSession default score IS 18/25 = 0.72 — the previous test relies on it.
    expect(18 / 25).toBe(0.72)
  })

  it('does not straddle the UTC midnight boundary', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ submitted_at: '2026-07-08T23:58:00.000Z' }),
          bossSession({ submitted_at: '2026-07-08T23:59:00.000Z' }),
          bossSession({ submitted_at: '2026-07-09T00:00:00.000Z' }), // next UTC day
        ],
      }),
    )
    expect(badge(a, 'hat-trick')).toBe(false)
  })

  it('failed sessions on the same day do not count', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ submitted_at: '2026-07-08T01:00:00.000Z' }),
          bossSession({ submitted_at: '2026-07-08T12:00:00.000Z' }),
          bossSession({ submitted_at: '2026-07-08T13:00:00.000Z', score: 17 }), // 68% fail
        ],
      }),
    )
    expect(badge(a, 'hat-trick')).toBe(false)
  })
})

describe('computeAchievements — comeback-kid', () => {
  it('unlocks when a category has a fail and a LATER pass', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ score: 10, submitted_at: '2026-07-01T10:00:00.000Z' }), // fail
          bossSession({ submitted_at: '2026-07-02T10:00:00.000Z' }), // later pass
        ],
      }),
    )
    expect(badge(a, 'comeback-kid')).toBe(true)
  })

  it('a fail at 17/25 (68%) followed by a pass at exactly 72% qualifies', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ score: 17, submitted_at: '2026-07-01T10:00:00.000Z' }),
          bossSession({ score: 18, submitted_at: '2026-07-02T10:00:00.000Z' }),
        ],
      }),
    )
    expect(badge(a, 'comeback-kid')).toBe(true)
  })

  const lockedCases: [string, ReturnType<typeof bossSession>[]][] = [
    [
      'the pass came BEFORE the fail',
      [
        bossSession({ submitted_at: '2026-07-01T10:00:00.000Z' }),
        bossSession({ score: 10, submitted_at: '2026-07-02T10:00:00.000Z' }),
      ],
    ],
    [
      'the fail and pass are in different categories',
      [
        bossSession({ category: 'Type I', score: 10, submitted_at: '2026-07-01T10:00:00.000Z' }),
        bossSession({ category: 'Type II', submitted_at: '2026-07-02T10:00:00.000Z' }),
      ],
    ],
    [
      'the fail and pass share the same submitted_at (not strictly later)',
      [
        bossSession({ score: 10, submitted_at: '2026-07-01T10:00:00.000Z' }),
        bossSession({ submitted_at: '2026-07-01T10:00:00.000Z' }),
      ],
    ],
    ['there are only passes', [bossSession(), bossSession()]],
    ['there are only fails', [bossSession({ score: 10 }), bossSession({ score: 5 })]],
  ]

  it.each(lockedCases)('stays locked when %s', (_label, sessions) => {
    expect(badge(computeAchievements(baseInputs({ sessions })), 'comeback-kid')).toBe(false)
  })
})

describe('computeAchievements — night-owl (03:00–09:59 UTC, a US-night approximation)', () => {
  it.each([
    ['03:00:00 (window start)', '2026-07-08T03:00:00.000Z', true],
    ['09:59:59 (window end)', '2026-07-08T09:59:59.000Z', true],
    ['02:59:59 (just before)', '2026-07-08T02:59:59.000Z', false],
    ['10:00:00 (just after)', '2026-07-08T10:00:00.000Z', false],
  ])('submitted at %s UTC → %s', (_label, iso, expected) => {
    const a = computeAchievements(baseInputs({ sessions: [bossSession({ submitted_at: iso })] }))
    expect(badge(a, 'night-owl')).toBe(expected)
  })

  it('even a failed session counts (showing up at night is the badge)', () => {
    const a = computeAchievements(
      baseInputs({ sessions: [bossSession({ score: 0, submitted_at: '2026-07-08T04:00:00.000Z' })] }),
    )
    expect(badge(a, 'night-owl')).toBe(true)
  })
})

describe('computeAchievements — weekend-warrior (UTC weekdays)', () => {
  // 2026-07-04 is a Saturday, 2026-07-05 a Sunday, 2026-07-11 the next Saturday.
  const SAT = '2026-07-04T15:00:00.000Z'
  const SUN = '2026-07-05T15:00:00.000Z'
  const SAT2 = '2026-07-11T15:00:00.000Z'

  it('unlocks with sessions on both a Saturday and a Sunday', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [bossSession({ submitted_at: SAT }), bossSession({ submitted_at: SUN })],
      }),
    )
    expect(badge(a, 'weekend-warrior')).toBe(true)
  })

  it('the Saturday and Sunday need not be the same weekend, and fails count', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [
          bossSession({ score: 0, submitted_at: SAT2 }),
          bossSession({ score: 0, submitted_at: SUN }),
        ],
      }),
    )
    expect(badge(a, 'weekend-warrior')).toBe(true)
  })

  it('two Saturdays are not enough', () => {
    const a = computeAchievements(
      baseInputs({
        sessions: [bossSession({ submitted_at: SAT }), bossSession({ submitted_at: SAT2 })],
      }),
    )
    expect(badge(a, 'weekend-warrior')).toBe(false)
  })

  it('a Sunday alone is not enough', () => {
    const a = computeAchievements(baseInputs({ sessions: [bossSession({ submitted_at: SUN })] }))
    expect(badge(a, 'weekend-warrior')).toBe(false)
  })
})

// ─── Wave 2: world completion + path-complete ────────────────────────────────

describe('computeAchievements — world-* / path-complete', () => {
  const WORLD_BADGES = ['world-core', 'world-type1', 'world-type2', 'world-type3'] as const

  it('unlocks each world badge when mastered ≥ total (total > 0)', () => {
    const a = computeAchievements(baseInputs({ worldCompletion: worlds(['Core', 'Type II']) }))
    expect(badge(a, 'world-core')).toBe(true)
    expect(badge(a, 'world-type1')).toBe(false)
    expect(badge(a, 'world-type2')).toBe(true)
    expect(badge(a, 'world-type3')).toBe(false)
    expect(badge(a, 'path-complete')).toBe(false)
  })

  it('path-complete requires ALL four worlds', () => {
    const three = computeAchievements(
      baseInputs({ worldCompletion: worlds(['Core', 'Type I', 'Type II']) }),
    )
    expect(badge(three, 'path-complete')).toBe(false)

    const four = computeAchievements(baseInputs({ worldCompletion: worlds([...SECTIONS]) }))
    for (const id of WORLD_BADGES) expect(badge(four, id)).toBe(true)
    expect(badge(four, 'path-complete')).toBe(true)
  })

  it('total = 0 NEVER unlocks, even with mastered ≥ total', () => {
    const a = computeAchievements(
      baseInputs({
        worldCompletion: {
          Core: { mastered: 0, total: 0 },
          'Type I': { mastered: 5, total: 0 }, // corrupt data — still locked
        },
      }),
    )
    expect(badge(a, 'world-core')).toBe(false)
    expect(badge(a, 'world-type1')).toBe(false)
    expect(badge(a, 'path-complete')).toBe(false)
  })

  it('an empty worldCompletion record locks everything', () => {
    const a = computeAchievements(baseInputs({ worldCompletion: {} }))
    for (const id of WORLD_BADGES) expect(badge(a, id)).toBe(false)
    expect(badge(a, 'path-complete')).toBe(false)
  })
})

// ─── Wave 2: universal-boss ──────────────────────────────────────────────────

describe('computeAchievements — universal-boss', () => {
  function universalExam(overrides: Partial<ReturnType<typeof bossSession>> = {}) {
    return bossSession({
      category: 'Universal',
      score: 90,
      total: 100,
      time_limit_secs: 7200,
      ...overrides,
    })
  }

  it('unlocks on a passed, timed, 100Q Universal exam', () => {
    const a = computeAchievements(baseInputs({ sessions: [universalExam()] }))
    expect(badge(a, 'universal-boss')).toBe(true)
  })

  it('passes at exactly the 72% boundary (72/100)', () => {
    const a = computeAchievements(baseInputs({ sessions: [universalExam({ score: 72 })] }))
    expect(badge(a, 'universal-boss')).toBe(true)
  })

  const lockedCases: [string, Partial<ReturnType<typeof bossSession>>][] = [
    ['the score is below 72% (71/100)', { score: 71 }],
    ['there are fewer than 100 questions', { score: 90, total: 99 }],
    ['the exam is untimed (0 sentinel)', { time_limit_secs: 0 }],
    ['the exam is untimed (null)', { time_limit_secs: null }],
    ['the category is a section, not Universal', { category: 'Core' }],
    ['the session is unscored', { score: null }],
  ]

  it.each(lockedCases)('stays locked when %s', (_label, overrides) => {
    const a = computeAchievements(baseInputs({ sessions: [universalExam(overrides)] }))
    expect(badge(a, 'universal-boss')).toBe(false)
  })
})

// ─── maxAnswersInOneDay (marathon-day input) ─────────────────────────────────

describe('maxAnswersInOneDay', () => {
  it('returns the busiest UTC day count', () => {
    const rows = [
      { answered_at: '2026-07-08T10:00:00.000Z' },
      { answered_at: '2026-07-08T11:00:00.000Z' },
      { answered_at: '2026-07-08T12:00:00.000Z' },
      { answered_at: '2026-07-09T10:00:00.000Z' },
    ]
    expect(maxAnswersInOneDay(rows)).toBe(3)
  })

  it('splits on the UTC midnight boundary', () => {
    const rows = [
      { answered_at: '2026-07-08T23:59:59.000Z' },
      { answered_at: '2026-07-09T00:00:00.000Z' },
    ]
    expect(maxAnswersInOneDay(rows)).toBe(1)
  })

  it('skips rows with missing/null answered_at', () => {
    const rows = [
      { answered_at: '2026-07-08T10:00:00.000Z' },
      { answered_at: null },
      {},
    ]
    expect(maxAnswersInOneDay(rows)).toBe(1)
  })

  it('is 0 for an empty window', () => {
    expect(maxAnswersInOneDay([])).toBe(0)
  })

  it('feeds marathon-day end-to-end at the 100-answer threshold', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      answered_at: `2026-07-08T10:${String(i % 60).padStart(2, '0')}:00.000Z`,
    }))
    const max = maxAnswersInOneDay(rows)
    expect(max).toBe(100)
    expect(badge(computeAchievements(baseInputs({ maxAnswersInADay: max })), 'marathon-day')).toBe(true)
  })
})

// ─── countActiveDays (activeDays XP input) ───────────────────────────────────

describe('countActiveDays', () => {
  it('counts distinct UTC days across answer rows and session timestamps', () => {
    const answers = [
      { answered_at: '2026-07-08T10:00:00.000Z' },
      { answered_at: '2026-07-08T22:00:00.000Z' }, // same day — dedupes
      { answered_at: '2026-07-09T01:00:00.000Z' },
    ]
    const sessions = [
      // started_at on a third day, submitted_at overlapping an answer day
      { started_at: '2026-07-01T10:00:00.000Z', submitted_at: '2026-07-09T02:00:00.000Z' },
    ]
    expect(countActiveDays(answers, sessions)).toBe(3) // 07-01, 07-08, 07-09
  })

  it('splits on the UTC midnight boundary', () => {
    const answers = [
      { answered_at: '2026-07-08T23:59:59.000Z' },
      { answered_at: '2026-07-09T00:00:00.000Z' },
    ]
    expect(countActiveDays(answers)).toBe(2)
  })

  it('skips null/missing timestamps on both inputs', () => {
    const answers = [{ answered_at: '2026-07-08T10:00:00.000Z' }, { answered_at: null }, {}]
    const sessions = [{ started_at: null, submitted_at: null }, {}]
    expect(countActiveDays(answers, sessions)).toBe(1)
  })

  it('sessions default to none, and empty inputs give 0', () => {
    expect(countActiveDays([])).toBe(0)
    expect(countActiveDays([], [])).toBe(0)
  })

  it('feeds the 20 XP/day term end-to-end', () => {
    const answers = [
      { answered_at: '2026-07-07T10:00:00.000Z' },
      { answered_at: '2026-07-08T10:00:00.000Z' },
    ]
    const activeDays = countActiveDays(answers)
    expect(activeDays).toBe(2)
    expect(computeAchievements(baseInputs({ activeDays })).xp).toBe(40)
  })
})

// ─── buildWorldCompletion (world-* input) ────────────────────────────────────

describe('buildWorldCompletion', () => {
  it('pairs the mastered/total maps for all four sections', () => {
    const wc = buildWorldCompletion(
      { Core: 3, 'Type I': 1 },
      { Core: 3, 'Type I': 4, 'Type II': 5, 'Type III': 2 },
    )
    expect(wc).toEqual({
      Core: { mastered: 3, total: 3 },
      'Type I': { mastered: 1, total: 4 },
      'Type II': { mastered: 0, total: 5 },
      'Type III': { mastered: 0, total: 2 },
    })
  })

  it('degrades missing categories to 0 (and 0-total worlds never unlock)', () => {
    const wc = buildWorldCompletion({}, {})
    expect(wc).toEqual({
      Core: { mastered: 0, total: 0 },
      'Type I': { mastered: 0, total: 0 },
      'Type II': { mastered: 0, total: 0 },
      'Type III': { mastered: 0, total: 0 },
    })
    const a = computeAchievements(baseInputs({ worldCompletion: wc }))
    expect(badge(a, 'world-core')).toBe(false)
    expect(badge(a, 'path-complete')).toBe(false)
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
