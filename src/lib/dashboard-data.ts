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
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient()

  // ── One Promise.all instead of 4 serial round-trips ──
  // profile, sessions, study-path progress, and the weak-spots RPC only need
  // userId and are independent of each other, so fire them concurrently. Every
  // downstream computation (tier, readiness, streak, mastery) runs after this
  // single await. The study-path + RPC calls stay individually try/caught below
  // so a missing table degrades gracefully; here we just parallelize the fetches.
  const admin = createAdminClient()
  const [profile, sessionsRes, masteredRes, rpcRes] = await Promise.all([
    getUserProfile(userId),
    // Cap the sessions scan: readiness only uses the last 6 per category and the
    // streak just scans dates — 500 newest sessions is ample and keeps this
    // query bounded as the table grows forever.
    supabase
      .from('test_sessions')
      .select('id, category, score, total, started_at, submitted_at')
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
  ])

  const tier = (profile?.tier ?? 'free') as Tier
  const isFree = tier === 'free'
  const lifetimeAccess = !!profile?.lifetime_access

  // All completed sessions (newest-first), capped at 500
  const allSessions = sessionsRes.data

  const totalTests = allSessions?.length ?? 0

  // Streak calculation
  let currentStreak = 0
  if (allSessions) {
    const dateSet = new Set<string>()
    for (const s of allSessions) {
      if (s.started_at) dateSet.add(s.started_at.slice(0, 10))
      if (s.submitted_at) dateSet.add(s.submitted_at.slice(0, 10))
    }
    const today = new Date()
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
  }

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

  // ─── Coach line: the single clear next step ───
  let coachLine: string
  if (totalTests === 0) {
    coachLine = 'Start with Core — the fundamentals every EPA 608 cert builds on.'
  } else if (!readiness.enoughData) {
    coachLine = 'Take a few tests to unlock your readiness score.'
  } else if (readiness.weakest && !readiness.weakest.ready) {
    const w = readiness.weakest
    coachLine = `Focus on ${w.category} — you're at ${w.avgPct}%, need ${w.threshold}%.`
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
  }
}
