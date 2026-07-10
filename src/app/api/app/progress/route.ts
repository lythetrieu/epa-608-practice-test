import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { TIER_LIMITS } from '@/lib/tier'
import type { Tier } from '@/types'
import { getWeakSpotsData } from '@/app/(app)/progress/weak-spots-data'
import { getPacingData } from '@/lib/pacing-server'
import { getMistakesData } from '@/lib/mistakes-server'
import { computeReadiness } from '@/lib/readiness'
import { SECTION_CATEGORIES, masteredConceptsByCategory } from '@/lib/section-progress'
import {
  computeAchievements,
  computeCurrentStreak,
  countDistinctQuestions,
  countFixedQuestions,
  fetchAchievementCounts,
  type Achievements,
} from '@/lib/achievements-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// JSON backend for the local-first Progress page (see ProgressClient +
// src/lib/local-first.ts). Same data the server page used to assemble:
// isPro gate, weak spots + radar, and the 8 most recent completed sessions.
// Middleware already 401s unauthenticated /api/app requests; the
// getCurrentUser check here is defense in depth.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getUserProfile(user.id)
  const tier = (profile?.tier ?? 'free') as Tier
  const isPro = TIER_LIMITS[tier].hasBlindSpot

  const supabase = await createClient()
  const [
    { spots, radarData, sectionRadar },
    { data: sessions },
    pacing,
    mistakes,
    achievementCounts,
    masteredRes,
    answersRes,
  ] = await Promise.all([
    getWeakSpotsData(user.id),
    // Widened from 8 → 500 so achievements can reuse the SAME query for the
    // streak, readiness (section-ready badges) and boss-down scans exactly as
    // dashboard-data does. recentSessions still slices the newest 8 below.
    supabase
      .from('test_sessions')
      .select('category, score, total, started_at, submitted_at, time_limit_secs')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(500),
    // Pacing analytics from user_progress.time_ms — null when no timed data
    // exists (or the 20260630 migration hasn't run). Old cached client payloads
    // simply lack the key; ProgressClient guards with optional chaining.
    getPacingData(user.id),
    // Mistakes analysis (repeat-wrong questions + per-section clustering) —
    // null on any query failure or when the user has no wrong answers.
    // Includes correctAnswer/explanation: this endpoint is authenticated-only
    // (middleware 401 + getCurrentUser above), so accounts are entitled to
    // answers, same as /api/app/submit results.
    getMistakesData(user.id),
    // ── Achievements inputs (the only NEW queries; everything else reuses
    // the fetches above). All degrade gracefully → achievements: null. ──
    // 2 head:true user_progress counts + 1 study_path_progress count.
    fetchAchievementCounts(supabase, user.id),
    // Mastered Study Path levels (same query/semantics as dashboard-data).
    supabase
      .from('study_path_progress')
      .select('concept_id')
      .eq('user_id', user.id)
      .eq('status', 'mastered')
      .then(r => r, () => ({ data: null })),
    // Newest-first answer window: full-bank distinct count + fixer badge.
    supabase
      .from('user_progress')
      .select('question_id, correct')
      .eq('user_id', user.id)
      .order('answered_at', { ascending: false })
      .limit(2000)
      .then(r => r, () => ({ data: null, error: true as unknown })),
  ])

  // ─── Achievements: XP + rank + derived badges (achievements-server) ───
  // Same computation dashboard-data runs; null on any error. Old cached
  // client payloads simply lack the key, so clients guard — and the
  // local-first VERSION is intentionally NOT bumped.
  let achievements: Achievements | null = null
  try {
    const { data: answerRows, error: answersError } = answersRes as {
      data: { question_id: string; correct: boolean }[] | null
      error?: unknown
    }
    if (achievementCounts && !answersError && Array.isArray(answerRows)) {
      const allSessions = sessions ?? []
      const masteredIds = ((masteredRes.data ?? []) as { concept_id: string }[]).map(
        r => r.concept_id,
      )
      achievements = computeAchievements({
        correctCount: achievementCounts.correctCount,
        wrongCount: achievementCounts.wrongCount,
        completedTests: allSessions.length,
        masteredLevels: Object.values(masteredConceptsByCategory(masteredIds)).reduce(
          (a, b) => a + b,
          0,
        ),
        sessions: allSessions,
        readiness: computeReadiness(allSessions, [...SECTION_CATEGORIES]),
        currentStreak: computeCurrentStreak(allSessions),
        hasPerfectLevel: achievementCounts.hasPerfectLevel,
        distinctQuestionsAnswered: countDistinctQuestions(answerRows),
        pacing: pacing ? { avgMs: pacing.avgMs, sampleSize: pacing.sampleSize } : null,
        fixedCount: countFixedQuestions(answerRows),
      })
    }
  } catch {
    achievements = null
  }

  return NextResponse.json({
    isPro,
    spots,
    radarData,
    // 4-axis Core/Type I/II/III fallback radar — optional on the client so
    // stale cached payloads (which lack the key) keep today's behavior.
    sectionRadar,
    // Same 8-newest shape as before the achievements change (started_at is
    // fetched for the streak but stripped here to keep the payload identical).
    recentSessions: (sessions ?? [])
      .slice(0, 8)
      .map(({ category, score, total, submitted_at, time_limit_secs }) => ({
        category,
        score,
        total,
        submitted_at,
        time_limit_secs,
      })),
    pacing,
    mistakes,
    achievements,
  })
}
