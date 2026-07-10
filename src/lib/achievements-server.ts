// Server-only achievements data layer: XP + rank + derived badges.
//
// Everything here is DERIVED from existing tables — there is no achievements
// table, no new migration, nothing for anyone to run in the SQL editor. The
// numbers are deterministic and replayable: recompute from the same rows and
// you get the same XP/badges, so old cached client payloads simply lack the
// `achievements` key and newer ones self-heal.
//
// XP formula (documented contract — keep in sync with any client copy):
//   xp = 10 × correct answers        (user_progress.correct = true)
//      +  3 × wrong answers          (effort counts; correct = false)
//      + 50 × completed test sessions (test_sessions.submitted_at NOT NULL)
//      +100 × Study Path levels mastered (study_path_progress.status = 'mastered')
//
// Rank thresholds: 0 / 500 / 1500 / 3500 / 7000 (see RANKS below).
//
// Data sources (all already exist):
//   user_progress        — RLS client (progress_select_own); head:true count
//                          queries for correct/wrong, plus the question_id
//                          window the callers already fetch.
//   test_sessions        — callers already fetch completed sessions.
//   study_path_progress  — RLS client (spp_select_own); missing table
//                          degrades gracefully (0 levels / no perfect-10).
//
// `computeAchievements(inputs)` is PURE — callers pass counts they already
// have (dashboard-data.ts, /api/app/progress) so no query runs twice.

import { aggregateMistakes, type MistakeRow } from '@/lib/mistakes-server'
import { EXAM_BUDGET_MS } from '@/lib/pacing-server'
import { SECTION_CATEGORIES } from '@/lib/section-progress'
import type { createClient } from '@/lib/supabase/server'

// ─── XP + rank constants ─────────────────────────────────────────────────────

export const XP_PER_CORRECT = 10
export const XP_PER_WRONG = 3
export const XP_PER_TEST = 50
export const XP_PER_LEVEL = 100

export const RANKS = [
  { id: 'apprentice', label: 'Apprentice', minXp: 0 },
  { id: 'tech-in-training', label: 'Tech in Training', minXp: 500 },
  { id: 'journeyman', label: 'Journeyman', minXp: 1500 },
  { id: 'senior-tech', label: 'Senior Tech', minXp: 3500 },
  { id: 'master-tech', label: 'Master Tech', minXp: 7000 },
] as const

export type RankId = (typeof RANKS)[number]['id']

// ─── Badge ids (stable order — matches BadgeIcons.tsx / the client) ─────────

export const BADGE_IDS = [
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
] as const

export type BadgeId = (typeof BADGE_IDS)[number]

// ─── Badge criteria constants ────────────────────────────────────────────────

// "Boss" = a timed 25-question section exam passed at the real 72% mark.
const BOSS_MIN_QUESTIONS = 25
const BOSS_PASS_RATIO = 0.72
// beat-the-clock: at/under the 72s/Q exam budget over a meaningful sample.
const BEAT_CLOCK_MIN_SAMPLE = 25
// fixer: this many once-wrong questions whose LATEST attempt is correct.
const FIXER_MIN_QUESTIONS = 10
// full-bank: distinct questions answered ≥ the published bank size (~569 —
// see question-pool.ts). Computed over a bounded newest-first window, see
// countDistinctQuestions below for the honest limitation.
export const FULL_BANK_SIZE = 569

// ─── Types ───────────────────────────────────────────────────────────────────

export type AchievementSession = {
  category: string
  score: number | null
  total: number
  started_at?: string | null
  submitted_at?: string | null
  time_limit_secs?: number | null
}

export type AchievementInputs = {
  /** Lifetime correct answers (user_progress, correct = true). */
  correctCount: number
  /** Lifetime wrong answers (user_progress, correct = false). */
  wrongCount: number
  /** Completed test sessions (callers pass the count they already fetched). */
  completedTests: number
  /** Study Path levels mastered (sum of masteredByCat / mastered rows). */
  masteredLevels: number
  /** Completed sessions (boss-down scan) — the list callers already have. */
  sessions: AchievementSession[]
  /** Readiness (computeReadiness output or a structural subset). */
  readiness: { byCategory: { category: string; ready: boolean }[] } | null
  /** Consecutive practice days (computeCurrentStreak / dashboard value). */
  currentStreak: number
  /** Any study_path_progress row with best_score = 100 (a perfect 10/10). */
  hasPerfectLevel: boolean
  /** Distinct question ids answered (countDistinctQuestions over the window). */
  distinctQuestionsAnswered: number
  /** Pacing aggregate, or null when the user has no timed data. */
  pacing: { avgMs: number; sampleSize: number } | null
  /** Once-wrong questions whose latest attempt is correct (countFixedQuestions). */
  fixedCount: number
}

export type Achievements = {
  xp: number
  rank: { id: RankId; label: string; minXp: number; nextMinXp: number | null }
  badges: { id: BadgeId; unlocked: boolean }[]
}

// ─── Pure computation ────────────────────────────────────────────────────────

/**
 * Pure, deterministic XP + rank + badge derivation. All inputs are counts /
 * aggregates the callers already have (or fetched via fetchAchievementCounts)
 * — this function never touches the network.
 */
export function computeAchievements(inputs: AchievementInputs): Achievements {
  const xp =
    XP_PER_CORRECT * Math.max(0, inputs.correctCount) +
    XP_PER_WRONG * Math.max(0, inputs.wrongCount) +
    XP_PER_TEST * Math.max(0, inputs.completedTests) +
    XP_PER_LEVEL * Math.max(0, inputs.masteredLevels)

  // Highest rank whose threshold the XP meets (RANKS is minXp-ascending).
  let rankIdx = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].minXp) rankIdx = i
  }
  const r = RANKS[rankIdx]
  const rank = {
    id: r.id as RankId,
    label: r.label as string,
    minXp: r.minXp as number,
    nextMinXp: (RANKS[rankIdx + 1]?.minXp ?? null) as number | null,
  }

  // ── Section readiness (core/type1/type2/type3-ready + universal-ready) ──
  const readyByCat = new Map<string, boolean>()
  for (const c of inputs.readiness?.byCategory ?? []) {
    readyByCat.set(c.category, c.ready)
  }
  const sectionReady = (cat: string) => readyByCat.get(cat) === true
  const sections = SECTION_CATEGORIES as readonly string[]
  const allSectionsReady = sections.every(sectionReady)

  // ── boss-down: a timed 25Q+ section exam passed at ≥72% ──
  const bossDown = inputs.sessions.some(
    s =>
      sections.includes(s.category) &&
      (s.time_limit_secs ?? 0) > 0 &&
      s.total >= BOSS_MIN_QUESTIONS &&
      s.score !== null &&
      s.score / s.total >= BOSS_PASS_RATIO,
  )

  const pacing = inputs.pacing
  const beatTheClock =
    pacing !== null &&
    pacing.sampleSize >= BEAT_CLOCK_MIN_SAMPLE &&
    pacing.avgMs <= EXAM_BUDGET_MS

  const unlockedById: Record<BadgeId, boolean> = {
    'core-ready': sectionReady('Core'),
    'type1-ready': sectionReady('Type I'),
    'type2-ready': sectionReady('Type II'),
    'type3-ready': sectionReady('Type III'),
    'universal-ready': allSectionsReady,
    'boss-down': bossDown,
    'perfect-10': inputs.hasPerfectLevel,
    'streak-3': inputs.currentStreak >= 3,
    'streak-7': inputs.currentStreak >= 7,
    'streak-14': inputs.currentStreak >= 14,
    'full-bank': inputs.distinctQuestionsAnswered >= FULL_BANK_SIZE,
    'beat-the-clock': beatTheClock,
    fixer: inputs.fixedCount >= FIXER_MIN_QUESTIONS,
  }

  return {
    xp,
    rank,
    badges: BADGE_IDS.map(id => ({ id, unlocked: unlockedById[id] })),
  }
}

// ─── Shared pure helpers ─────────────────────────────────────────────────────

/**
 * Consecutive practice days ending today (or yesterday, as grace). Extracted
 * verbatim from the dashboard streak block so /api/app/progress and
 * dashboard-data share ONE implementation (`now` injectable for tests).
 * Preserves the original quirk: local-midnight anchor formatted as a UTC day.
 */
export function computeCurrentStreak(
  sessions: { started_at?: string | null; submitted_at?: string | null }[],
  now: Date = new Date(),
): number {
  let currentStreak = 0
  const dateSet = new Set<string>()
  for (const s of sessions) {
    if (s.started_at) dateSet.add(s.started_at.slice(0, 10))
    if (s.submitted_at) dateSet.add(s.submitted_at.slice(0, 10))
  }
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const d = new Date(today)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  while (dateSet.has(fmt(d))) {
    currentStreak++
    d.setDate(d.getDate() - 1)
  }
  if (currentStreak === 0) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const y = new Date(yesterday)
    while (dateSet.has(fmt(y))) {
      currentStreak++
      y.setDate(y.getDate() - 1)
    }
  }
  return currentStreak
}

/**
 * Distinct question ids in an answer-row window (full-bank input).
 *
 * Honest limitation: Supabase/PostgREST has no head-count for DISTINCT and
 * there is no existing RPC for it, so this is exact ONLY within the bounded
 * newest-first window the callers fetch (2000 rows). A user with more than
 * 2000 lifetime answers whose only exposure to some questions is older than
 * the window can be undercounted (badge unlocks late, never wrongly early) —
 * acceptable for a badge, and it avoids an unbounded table scan per request.
 */
export function countDistinctQuestions(rows: { question_id: string }[]): number {
  const seen = new Set<string>()
  for (const r of rows) seen.add(r.question_id)
  return seen.size
}

/**
 * "Fixer" input: questions wrong at least once whose LATEST attempt is
 * correct. Reuses aggregateMistakes (mistakes-server) — the exact same
 * newest-first grouping the Mistakes section is built on — rather than
 * forking the logic. `rows` MUST be newest-first (answered_at DESC).
 */
export function countFixedQuestions(
  rows: { question_id: string; correct: boolean; answered_at?: string | null }[],
): number {
  const mistakeRows: MistakeRow[] = rows.map(r => ({
    question_id: r.question_id,
    correct: r.correct,
    answered_at: r.answered_at ?? null,
  }))
  const agg = aggregateMistakes(mistakeRows, new Map())
  if (!agg) return 0
  return agg.ranked.filter(s => s.lastCorrect && s.wrongCount >= 1).length
}

// ─── Fetch helper (the 2-3 cheap extra queries, shared by both callers) ─────

type RlsClient = Awaited<ReturnType<typeof createClient>>

export type AchievementCounts = {
  correctCount: number
  wrongCount: number
  hasPerfectLevel: boolean
}

/**
 * The only NEW queries achievements needs beyond what the callers already
 * fetch: two head:true counts on user_progress (no row payload) and one
 * head:true count on study_path_progress for perfect-10. All through the RLS
 * client — the caller is always the signed-in user.
 *
 * Returns null when the core user_progress counts fail (callers then emit
 * achievements: null). A missing study_path_progress table (migration not
 * run) degrades to hasPerfectLevel: false, matching how the dashboard already
 * treats Study Path data as optional.
 */
export async function fetchAchievementCounts(
  supabase: RlsClient,
  userId: string,
): Promise<AchievementCounts | null> {
  try {
    const [correctRes, wrongRes, perfectRes] = await Promise.all([
      supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('correct', true),
      supabase
        .from('user_progress')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('correct', false),
      supabase
        .from('study_path_progress')
        .select('concept_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('best_score', 100) // best_score is a 0–100 percentage; 100 = a perfect 10/10 level
        .then(
          r => ({ count: r.count, error: r.error as unknown }),
          () => ({ count: null, error: true as unknown }),
        ),
    ])
    if (correctRes.error || wrongRes.error) return null
    return {
      correctCount: correctRes.count ?? 0,
      wrongCount: wrongRes.count ?? 0,
      hasPerfectLevel: !perfectRes.error && (perfectRes.count ?? 0) > 0,
    }
  } catch {
    return null
  }
}
