// Server-only dashboard data assembly (Perf Phase 3).
//
// Extracted verbatim from src/app/(app)/dashboard/page.tsx so the same
// queries + computations can back the /api/app/dashboard JSON endpoint that
// DashboardClient renders local-first. Returns a plain JSON-serializable
// object — no Dates, no functions.

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/supabase/auth'
import { TIER_LIMITS, type Tier } from '@/types'
import { computeReadiness, type Readiness } from '@/lib/readiness'
import {
  totalConceptsByCategory,
  masteredConceptsByCategory,
} from '@/lib/section-progress'
import { getPacingData, EXAM_BUDGET_MS } from '@/lib/pacing-server'
import {
  buildWorldCompletion,
  computeAchievements,
  computeCurrentStreak,
  countDistinctQuestions,
  countFixedQuestions,
  fetchAchievementCounts,
  maxAnswersInOneDay,
  type Achievements,
} from '@/lib/achievements-server'

export type DashboardData = {
  tier: Tier
  isFree: boolean
  lifetimeAccess: boolean
  totalTests: number
  currentStreak: number
  avgScore: number | null
  readiness: Readiness
  masteredByCat: Record<string, number>
  totalsByCat: Record<string, number>
  practicedByCat: Record<string, number> | null
  coachLine: string
  showWeakestAlert: boolean
  paceMs: number | null
  /** Per-day answer counts (UTC YYYY-MM-DD) for the activity heatmap; null on query error. */
  activity: {
    days: Record<string, number>
    activeDays: number
    windowDays: number
  } | null
  /**
   * XP + rank + derived badges (achievements-server). null on any error —
   * old cached client payloads simply lack the key, so clients must guard.
   */
  achievements: Achievements | null
}

// Heatmap window: 16 weeks (matches the 16-column GitHub-style grid on Home).
const ACTIVITY_WINDOW_DAYS = 112

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()

  // ── One Promise.all instead of 4 serial round-trips ──
  // profile, sessions, study-path progress, and the weak-spots RPC only need
  // userId and are independent of each other, so fire them concurrently. Every
  // downstream computation (tier, readiness, streak, mastery) runs after this
  // single await. The study-path + RPC calls stay individually try/caught below
  // so a missing table degrades gracefully; here we just parallelize the fetches.
  const admin = createAdminClient()
  const [profile, sessionsRes, masteredRes, rpcRes, pacing, activityRes, achievementCounts] = await Promise.all([
    getUserProfile(userId),
    // Cap the sessions scan: readiness only uses the last 6 per category and the
    // streak just scans dates — 500 newest sessions is ample and keeps this
    // query bounded as the table grows forever. time_limit_secs feeds the
    // boss-down badge (timed 25Q section exam passed).
    supabase
      .from('test_sessions')
      .select('id, category, score, total, started_at, submitted_at, time_limit_secs')
      .eq('user_id', userId)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(500),
    supabase
      .from('study_path_progress')
      .select('concept_id')
      .eq('user_id', userId)
      .eq('status', 'mastered')
      .then(r => r, () => ({ data: null })),
    admin
      .rpc('weak_spots_by_category', { p_user_id: userId })
      .then(r => r, () => ({ data: null, error: true as unknown })),
    // Lighter pacing variant: overall average only, no subtopic join (the
    // full slowTopics breakdown lives on /api/app/progress). Already returns
    // null on any error / missing time_ms data.
    getPacingData(userId, { topics: false }).then(r => r, () => null),
    // Answer window from user_progress — one row per answered question (incl.
    // Study Path). Triple duty: activity heatmap (answered_at), full-bank
    // distinct question count and the fixer badge (question_id + correct).
    // Uses the (user_id, answered_at DESC) index; 2000 rows is ample for the
    // 112-day heatmap window and is the bounded window the full-bank count is
    // exact within. Failure → activity: null AND achievements: null.
    supabase
      .from('user_progress')
      .select('question_id, correct, answered_at')
      .eq('user_id', userId)
      .order('answered_at', { ascending: false })
      .limit(2000)
      .then(r => r, () => ({ data: null, error: true as unknown })),
    // 2 head:true counts on user_progress + 1 on study_path_progress — the
    // only NEW queries achievements adds. null → achievements: null.
    fetchAchievementCounts(supabase, userId),
  ])

  const tier = (profile?.tier ?? 'free') as Tier
  const isFree = tier === 'free'
  const lifetimeAccess = !!profile?.lifetime_access

  // All completed sessions (newest-first), capped at 500
  const allSessions = sessionsRes.data

  const totalTests = allSessions?.length ?? 0

  // Streak calculation (shared with /api/app/progress — one implementation)
  const currentStreak = computeCurrentStreak(allSessions ?? [])

  // Average score across all completed tests
  let avgScore: number | null = null
  const scored = (allSessions ?? []).filter(s => s.score !== null && s.total > 0)
  if (scored.length > 0) {
    avgScore = Math.round(
      scored.reduce((sum, s) => sum + (s.score! / s.total) * 100, 0) / scored.length
    )
  }

  // ─── Exam readiness (real per-cert pass marks, shared lib) ───
  const pursue = [...TIER_LIMITS[tier].categories, 'Universal']
  const readiness = computeReadiness(allSessions ?? [], pursue)

  // ─── Study Path levels mastered per section (Study X/Y) ───
  // Falls back to 0/Y if the table is missing or the query failed (masteredRes
  // resolves to { data: null } in that case — see the Promise.all above).
  let masteredByCat: Record<string, number> = {}
  try {
    const mastered = masteredRes.data as { concept_id: string }[] | null
    masteredByCat = masteredConceptsByCategory(
      (mastered ?? []).map(r => r.concept_id)
    )
  } catch {
    masteredByCat = {}
  }
  const totalsByCat = totalConceptsByCategory()

  // ─── Questions practiced per section (RPC; omit the number on failure) ───
  let practicedByCat: Record<string, number> | null = null
  const { data: agg, error: rpcError } = rpcRes as {
    data: unknown
    error?: unknown
  }
  if (!rpcError && Array.isArray(agg)) {
    practicedByCat = {}
    for (const row of agg as { category: string; wrong: number; total: number }[]) {
      practicedByCat[row.category || 'Core'] = Number(row.total) || 0
    }
  }

  // ─── Pacing (overall avg ms per question; null = no timed data) ───
  const paceMs = pacing?.avgMs ?? null

  // ─── Activity heatmap: per-day answer counts, last 112 days (UTC) ───
  // Counts come from user_progress.answered_at; session dates (already
  // fetched) are merged in with at-least-1 counts so old test days beyond the
  // 1500-row user_progress window still light up.
  let activity: DashboardData['activity'] = null
  const { data: activityRows, error: activityError } = activityRes as {
    data: { question_id: string; correct: boolean; answered_at: string | null }[] | null
    error?: unknown
  }
  if (!activityError && Array.isArray(activityRows)) {
    const minDate = new Date(Date.now() - (ACTIVITY_WINDOW_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const days: Record<string, number> = {}
    for (const row of activityRows) {
      const day = (row.answered_at ?? '').slice(0, 10)
      if (day.length === 10 && day >= minDate) days[day] = (days[day] ?? 0) + 1
    }
    for (const s of allSessions ?? []) {
      for (const iso of [s.started_at, s.submitted_at]) {
        const day = (iso ?? '').slice(0, 10)
        if (day.length === 10 && day >= minDate && !(day in days)) days[day] = 1
      }
    }
    activity = {
      days,
      activeDays: Object.keys(days).length,
      windowDays: ACTIVITY_WINDOW_DAYS,
    }
  }

  // ─── Achievements: XP + rank + derived badges (achievements-server) ───
  // Pure computation over pieces already fetched above (sessions, readiness,
  // streak, pacing, mastered levels, the user_progress window) plus the
  // head-count queries from the Promise.all. Any missing core input → null;
  // clients guard for the absent key (old cached payloads lack it anyway).
  let achievements: Achievements | null = null
  try {
    if (achievementCounts && !activityError && Array.isArray(activityRows)) {
      achievements = computeAchievements({
        correctCount: achievementCounts.correctCount,
        wrongCount: achievementCounts.wrongCount,
        completedTests: totalTests,
        masteredLevels: Object.values(masteredByCat).reduce((a, b) => a + b, 0),
        sessions: allSessions ?? [],
        readiness,
        currentStreak,
        hasPerfectLevel: achievementCounts.hasPerfectLevel,
        distinctQuestionsAnswered: countDistinctQuestions(activityRows),
        pacing: pacing ? { avgMs: pacing.avgMs, sampleSize: pacing.sampleSize } : null,
        fixedCount: countFixedQuestions(activityRows),
        // marathon-day: bucket the SAME 2000-row answer window the heatmap
        // uses by UTC day — no window cutoff here (the badge is lifetime-ish
        // within the bounded window), no new query.
        maxAnswersInADay: maxAnswersInOneDay(activityRows),
        // world-* badges: pair the Study X/Y maps computed above.
        worldCompletion: buildWorldCompletion(masteredByCat, totalsByCat),
      })
    }
  } catch {
    achievements = null
  }

  // ─── Coach line: the single clear next step ───
  // Accuracy beats speed: the weakest-category message always wins. Only when
  // the user is otherwise exam-ready does a slow pace (>15% over the 72s/Q
  // exam budget) swap in the speed message.
  let coachLine: string
  if (totalTests === 0) {
    coachLine = 'Start with Core — the fundamentals every EPA 608 cert builds on.'
  } else if (!readiness.enoughData) {
    coachLine = 'Take a few tests to unlock your readiness score.'
  } else if (readiness.weakest && !readiness.weakest.ready) {
    const w = readiness.weakest
    coachLine = `Focus on ${w.category} — you're at ${w.avgPct}%, need ${w.threshold}%.`
  } else if (paceMs !== null && paceMs > EXAM_BUDGET_MS * 1.15) {
    const slowerPct = Math.round((paceMs / EXAM_BUDGET_MS - 1) * 100)
    coachLine = `You're accurate but ~${slowerPct}% slower than exam pace — drill for faster recall.`
  } else {
    coachLine = "You're exam-ready. Lock it in with a Universal simulation."
  }

  const showWeakestAlert =
    readiness.enoughData && !!readiness.weakest && !readiness.weakest.ready

  return {
    tier,
    isFree,
    lifetimeAccess,
    totalTests,
    currentStreak,
    avgScore,
    readiness,
    masteredByCat,
    totalsByCat,
    practicedByCat,
    coachLine,
    showWeakestAlert,
    paceMs,
    activity,
    achievements,
  }
}
