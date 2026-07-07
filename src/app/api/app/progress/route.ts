import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { TIER_LIMITS } from '@/lib/tier'
import type { Tier } from '@/types'
import { getWeakSpotsData } from '@/app/(app)/progress/weak-spots-data'

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
  const [{ spots, radarData }, { data: sessions }] = await Promise.all([
    getWeakSpotsData(user.id),
    supabase
      .from('test_sessions')
      .select('category, score, total, submitted_at, time_limit_secs')
      .eq('user_id', user.id)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(8),
  ])

  return NextResponse.json({
    isPro,
    spots,
    radarData,
    recentSessions: sessions ?? [],
  })
}
