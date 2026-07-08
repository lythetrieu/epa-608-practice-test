import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { TIER_LIMITS } from '@/lib/tier'
import type { Tier } from '@/types'
import { getWeakSpotsData } from '@/app/(app)/progress/weak-spots-data'
import { getPacingData } from '@/lib/pacing-server'
import { getMistakesData } from '@/lib/mistakes-server'

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
  const [{ spots, radarData, sectionRadar }, { data: sessions }, pacing, mistakes] = await Promise.all([
    getWeakSpotsData(user.id),
    supabase
      .from('test_sessions')
      .select('category, score, total, submitted_at, time_limit_secs')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(8),
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
  ])

  return NextResponse.json({
    isPro,
    spots,
    radarData,
    // 4-axis Core/Type I/II/III fallback radar — optional on the client so
    // stale cached payloads (which lack the key) keep today's behavior.
    sectionRadar,
    recentSessions: sessions ?? [],
    pacing,
    mistakes,
  })
}
