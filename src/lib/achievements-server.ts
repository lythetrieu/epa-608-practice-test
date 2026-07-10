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
//      + 20 × active days             (distinct UTC days with ≥1 answer, see
//                                      countActiveDays — bounded-window input)
//      +  Σ BADGE_XP[id].xp over unlocked badges (rarity-tiered bonuses)
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
export const XP_PER_ACTIVE_DAY = 20

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
  // ── Wave 2 (appended AFTER the original 13 — order is pinned; the client
  // BadgeIcons/badge-meta arrays index by this order) ──
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
] as const

export type BadgeId = (typeof BADGE_IDS)[number]

// ─── Badge XP economy (rarity-tiered bonuses added to the XP total) ─────────
//
// Every badge id MUST have an entry (contract-tested). Unlocking a badge adds
// its xp to the user's total — deterministic and replayable like everything
// else here: badges are derived, so their XP re-derives identically.

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export const BADGE_XP: Record<BadgeId, { rarity: BadgeRarity; xp: number }> = {
  // ── common ──
  'first-test': { rarity: 'common', xp: 25 },
  'first-level': { rarity: 'common', xp: 25 },
  'streak-3': { rarity: 'common', xp: 50 },
  century: { rarity: 'common', xp: 50 },
  'night-owl': { rarity: 'common', xp: 50 },
  'weekend-warrior': { rarity: 'common', xp: 50 },
  // ── rare ──
  'streak-7': { rarity: 'rare', xp: 150 },
  'hat-trick': { rarity: 'rare', xp: 150 },
  'comeback-kid': { rarity: 'rare', xp: 150 },
  sharpshooter: { rarity: 'rare', xp: 150 },
  fixer: { rarity: 'rare', xp: 150 },
  'half-bank': { rarity: 'rare', xp: 150 },
  'perfect-10': { rarity: 'rare', xp: 150 },
  // ── epic ──
  'core-ready': { rarity: 'epic', xp: 200 },
  'type1-ready': { rarity: 'epic', xp: 200 },
  'type2-ready': { rarity: 'epic', xp: 200 },
  'type3-ready': { rarity: 'epic', xp: 200 },
  'boss-down': { rarity: 'epic', xp: 200 },
  'beat-the-clock': { rarity: 'epic', xp: 200 },
  'marathon-day': { rarity: 'epic', xp: 200 },
  'world-core': { rarity: 'epic', xp: 250 },
  'world-type1': { rarity: 'epic', xp: 250 },
  'world-type2': { rarity: 'epic', xp: 250 },
  'world-type3': { rarity: 'epic', xp: 250 },
  'streak-14': { rarity: 'epic', xp: 300 },
  'speed-runner': { rarity: 'epic', xp: 300 },
  'fix-master': { rarity: 'epic', xp: 300 },
  'flawless-exam': { rarity: 'epic', xp: 300 },
  // ── legendary ──
  'universal-ready': { rarity: 'legendary', xp: 500 },
  'full-bank': { rarity: 'legendary', xp: 500 },
  'iron-streak-30': { rarity: 'legendary', xp: 500 },
  'path-complete': { rarity: 'legendary', xp: 750 },
  'universal-boss': { rarity: 'legendary', xp: 1000 },
}

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

// ── Wave-2 badge criteria ──
// A generic session "pass" = the real 72% exam mark (same ratio as boss-down).
const SESSION_PASS_RATIO = 0.72
// sharpshooter / flawless-exam / speed-runner apply to real-exam-sized
// sessions only (same 25-question floor as boss-down).
const EXAM_MIN_QUESTIONS = 25
const SHARPSHOOTER_RATIO = 0.9
// speed-runner: a PASSED timed exam averaging ≤50s per question wall-clock.
const SPEED_RUNNER_MS_PER_Q = 50_000
// hat-trick: this many passed sessions submitted on one UTC day.
const HAT_TRICK_PASSES = 3
// night-owl window (UTC hours, inclusive). Approximation: 03:00–09:59 UTC
// covers late-night/early-morning across US timezones (≈22:00–05:59 ET /
// 19:00–02:59 PT); we do NOT know the user's timezone server-side, so this
// is a deliberate US-night heuristic, not a per-user local-time check.
const NIGHT_OWL_START_HOUR = 3
const NIGHT_OWL_END_HOUR = 9
// century: lifetime answers (correct + wrong).
const CENTURY_ANSWERS = 100
// half-bank: distinct questions ≥ half the ~569 bank.
export const HALF_BANK_SIZE = 285
// marathon-day: this many answers on a single UTC day (see maxAnswersInADay).
const MARATHON_DAY_ANSWERS = 100
const IRON_STREAK_DAYS = 30
// fix-master: fixer's big sibling (25 once-wrong questions now correct).
const FIX_MASTER_MIN_QUESTIONS = 25
// universal-boss: a PASSED timed Universal exam of 100+ questions.
const UNIVERSAL_BOSS_MIN_QUESTIONS = 100

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
  /**
   * Most answers on any single UTC day (maxAnswersInOneDay over the same
   * bounded 2000-row answer window the callers already fetch — no new query).
   */
  maxAnswersInADay: number
  /**
   * Study Path completion per section — keys 'Core' / 'Type I' / 'Type II' /
   * 'Type III' (buildWorldCompletion). Both callers already have the
   * mastered/total per-category maps; this just pairs them up.
   */
  worldCompletion: Record<string, { mastered: number; total: number }>
  /**
   * Distinct UTC days with ≥1 answer (countActiveDays over the bounded
   * 2000-row answer window both callers already fetch, merged with session
   * dates — same honest window limitation as countDistinctQuestions: can
   * only undercount, never over).
   */
  activeDays: number
}

export type Achievements = {
  xp: number
  /** XP earned from unlocked badges alone (already included in `xp`). */
  badgeXp: number
  rank: { id: RankId; label: string; minXp: number; nextMinXp: number | null }
  badges: { id: BadgeId; unlocked: boolean; rarity: BadgeRarity; xp: number }[]
}

// ─── Pure computation ────────────────────────────────────────────────────────

/**
 * Pure, deterministic XP + rank + badge derivation. All inputs are counts /
 * aggregates the callers already have (or fetched via fetchAchievementCounts)
 * — this function never touches the network.
 */
export function computeAchievements(inputs: AchievementInputs): Achievements {
  // Activity XP. Badge bonuses are added AFTER the badge scan below — badges
  // never depend on XP (only on activity inputs), so this is not circular.
  const baseXp =
    XP_PER_CORRECT * Math.max(0, inputs.correctCount) +
    XP_PER_WRONG * Math.max(0, inputs.wrongCount) +
    XP_PER_TEST * Math.max(0, inputs.completedTests) +
    XP_PER_LEVEL * Math.max(0, inputs.masteredLevels) +
    XP_PER_ACTIVE_DAY * Math.max(0, inputs.activeDays)

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

  // ── Wave-2 session scans ─────────────────────────────────────────────────
  // A "pass" = score/total ≥ 72% on a scored session (same mark as boss-down).
  const isPass = (s: AchievementSession) =>
    s.score !== null && s.total > 0 && s.score / s.total >= SESSION_PASS_RATIO
  const isFail = (s: AchievementSession) =>
    s.score !== null && s.total > 0 && s.score / s.total < SESSION_PASS_RATIO

  // sharpshooter: ≥90% on a real-exam-sized (25Q+) session.
  const sharpshooter = inputs.sessions.some(
    s => s.total >= EXAM_MIN_QUESTIONS && s.score !== null && s.score / s.total >= SHARPSHOOTER_RATIO,
  )
  // flawless-exam: a perfect score on a 25Q+ session.
  const flawlessExam = inputs.sessions.some(
    s => s.total >= EXAM_MIN_QUESTIONS && s.score !== null && s.score === s.total,
  )
  // speed-runner: a PASSED timed 25Q+ exam averaging ≤50s/question wall-clock
  // (both timestamps required; a non-positive duration means clock skew — skip).
  const speedRunner = inputs.sessions.some(s => {
    if (!isPass(s)) return false
    if ((s.time_limit_secs ?? 0) <= 0 || s.total < EXAM_MIN_QUESTIONS) return false
    if (!s.started_at || !s.submitted_at) return false
    const durationMs = Date.parse(s.submitted_at) - Date.parse(s.started_at)
    if (!Number.isFinite(durationMs) || durationMs <= 0) return false
    return durationMs / s.total <= SPEED_RUNNER_MS_PER_Q
  })

  // hat-trick: ≥3 passed sessions submitted on the same UTC day.
  const passesByDay = new Map<string, number>()
  let hatTrick = false
  for (const s of inputs.sessions) {
    if (!isPass(s) || !s.submitted_at) continue
    const day = s.submitted_at.slice(0, 10)
    if (day.length !== 10) continue
    const n = (passesByDay.get(day) ?? 0) + 1
    passesByDay.set(day, n)
    if (n >= HAT_TRICK_PASSES) hatTrick = true
  }

  // comeback-kid: some category has a fail and a strictly LATER pass
  // (ISO-8601 submitted_at strings compare correctly lexicographically).
  const earliestFailByCat = new Map<string, string>()
  for (const s of inputs.sessions) {
    if (!isFail(s) || !s.submitted_at) continue
    const prev = earliestFailByCat.get(s.category)
    if (prev === undefined || s.submitted_at < prev) earliestFailByCat.set(s.category, s.submitted_at)
  }
  const comebackKid = inputs.sessions.some(s => {
    if (!isPass(s) || !s.submitted_at) return false
    const failAt = earliestFailByCat.get(s.category)
    return failAt !== undefined && s.submitted_at > failAt
  })

  // night-owl: any session submitted 03:00–09:59 UTC. Approximation — see the
  // NIGHT_OWL_* constants; server code has no user timezone, so this targets
  // "US night-ish" hours in UTC rather than true local time.
  const nightOwl = inputs.sessions.some(s => {
    if (!s.submitted_at) return false
    const t = Date.parse(s.submitted_at)
    if (!Number.isFinite(t)) return false
    const hour = new Date(t).getUTCHours()
    return hour >= NIGHT_OWL_START_HOUR && hour <= NIGHT_OWL_END_HOUR
  })

  // weekend-warrior: sessions (pass or fail) submitted on BOTH a Saturday and
  // a Sunday (UTC) — not necessarily the same weekend.
  let sawSaturday = false
  let sawSunday = false
  for (const s of inputs.sessions) {
    if (!s.submitted_at) continue
    const t = Date.parse(s.submitted_at)
    if (!Number.isFinite(t)) continue
    const dow = new Date(t).getUTCDay()
    if (dow === 6) sawSaturday = true
    if (dow === 0) sawSunday = true
  }
  const weekendWarrior = sawSaturday && sawSunday

  // world-*: a Study Path section is "complete" when every level is mastered.
  // total=0 (concept data missing / table not seeded) NEVER unlocks.
  const worldComplete = (cat: string) => {
    const w = inputs.worldCompletion[cat]
    return !!w && w.total > 0 && w.mastered >= w.total
  }
  const allWorldsComplete = sections.every(worldComplete)

  // universal-boss: a PASSED timed Universal exam of 100+ questions.
  const universalBoss = inputs.sessions.some(
    s =>
      s.category === 'Universal' &&
      (s.time_limit_secs ?? 0) > 0 &&
      s.total >= UNIVERSAL_BOSS_MIN_QUESTIONS &&
      isPass(s),
  )

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
    'first-test': inputs.completedTests >= 1,
    'first-level': inputs.masteredLevels >= 1,
    sharpshooter,
    'flawless-exam': flawlessExam,
    'speed-runner': speedRunner,
    'hat-trick': hatTrick,
    'comeback-kid': comebackKid,
    'night-owl': nightOwl,
    'weekend-warrior': weekendWarrior,
    century: inputs.correctCount + inputs.wrongCount >= CENTURY_ANSWERS,
    'half-bank': inputs.distinctQuestionsAnswered >= HALF_BANK_SIZE,
    'marathon-day': inputs.maxAnswersInADay >= MARATHON_DAY_ANSWERS,
    'iron-streak-30': inputs.currentStreak >= IRON_STREAK_DAYS,
    'fix-master': inputs.fixedCount >= FIX_MASTER_MIN_QUESTIONS,
    'world-core': worldComplete('Core'),
    'world-type1': worldComplete('Type I'),
    'world-type2': worldComplete('Type II'),
    'world-type3': worldComplete('Type III'),
    'path-complete': allWorldsComplete,
    'universal-boss': universalBoss,
  }

  // ── Total XP = activity XP + rarity-tiered badge bonuses, then rank ──────
  const badges = BADGE_IDS.map(id => ({
    id,
    unlocked: unlockedById[id],
    rarity: BADGE_XP[id].rarity,
    xp: BADGE_XP[id].xp,
  }))
  const badgeXp = badges.reduce((sum, b) => sum + (b.unlocked ? b.xp : 0), 0)
  const xp = baseXp + badgeXp

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

  return { xp, badgeXp, rank, badges }
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

/**
 * "Marathon day" input: the most answers recorded on any single UTC day,
 * bucketed by answered_at date. Runs over the SAME bounded newest-first
 * 2000-row answer window the callers already fetch (dashboard activity /
 * progress-route answers) — zero new queries, same honest window limitation
 * as countDistinctQuestions (can only undercount, never over).
 */
export function maxAnswersInOneDay(rows: { answered_at?: string | null }[]): number {
  const byDay = new Map<string, number>()
  let max = 0
  for (const r of rows) {
    const day = (r.answered_at ?? '').slice(0, 10)
    if (day.length !== 10) continue
    const n = (byDay.get(day) ?? 0) + 1
    byDay.set(day, n)
    if (n > max) max = n
  }
  return max
}

/**
 * "Active days" XP input: distinct UTC days with ≥1 answer. Runs over the
 * SAME bounded newest-first 2000-row answer window the callers already fetch,
 * MERGED with the session dates they also already have (started_at +
 * submitted_at) — exactly like the dashboard heatmap merges session days —
 * so old test days whose per-question rows fell out of the window still
 * count. Zero new queries; same honest window limitation as
 * countDistinctQuestions (can only undercount, never over).
 */
export function countActiveDays(
  answerRows: { answered_at?: string | null }[],
  sessions: { started_at?: string | null; submitted_at?: string | null }[] = [],
): number {
  const days = new Set<string>()
  const add = (iso?: string | null) => {
    const day = (iso ?? '').slice(0, 10)
    if (day.length === 10) days.add(day)
  }
  for (const r of answerRows) add(r.answered_at)
  for (const s of sessions) {
    add(s.started_at)
    add(s.submitted_at)
  }
  return days.size
}

/**
 * worldCompletion input builder: pairs the mastered-per-category and
 * total-per-category maps both callers already compute (dashboard's
 * masteredByCat/totalsByCat; the progress route's masteredConceptsByCategory /
 * totalConceptsByCategory) into one record keyed by section. A category
 * missing from either map degrades to 0 — and total=0 never unlocks a badge.
 */
export function buildWorldCompletion(
  masteredByCat: Record<string, number>,
  totalsByCat: Record<string, number>,
): Record<string, { mastered: number; total: number }> {
  const out: Record<string, { mastered: number; total: number }> = {}
  for (const cat of SECTION_CATEGORIES) {
    out[cat] = {
      mastered: masteredByCat[cat] ?? 0,
      total: totalsByCat[cat] ?? 0,
    }
  }
  return out
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
