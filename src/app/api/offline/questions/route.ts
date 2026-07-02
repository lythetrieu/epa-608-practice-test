import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/types'
import { downloadRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'
import type { Tier } from '@/types'

/**
 * GET /api/offline/questions
 *
 * Returns ALL questions (with answer_text + explanation) for offline caching.
 * Offline is a Pro-only feature (see pricing), so this endpoint is gated to
 * paid tiers — otherwise it hands the entire answer bank to any free account.
 * Questions are grouped by category.
 *
 * This endpoint is called once by the client-side sync logic and the response
 * is stored in IndexedDB/localStorage so the app works without network.
 */
export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pro gate — offline caching of the full bank is a paid feature.
  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()
  const tier = (profile?.tier ?? 'free') as Tier
  if (!TIER_LIMITS[tier].hasBlindSpot) {
    return NextResponse.json(
      { error: 'Offline access is a Pro feature.', upgradeRequired: true },
      { status: 403 },
    )
  }

  // Rate limit — this returns the whole question bank; cap per user per day.
  const rl = await downloadRateLimit.limit(user.id || getIdentifier(request))
  if (!rl.success) return rateLimitResponse(rl.reset)

  // Use admin client to bypass RLS and fetch all questions
  const admin = createAdminClient()

  const { data: questions, error } = await admin
    .from('questions')
    .select('id, category, subtopic_id, question, options, answer_text, explanation, difficulty')
    .neq('question_type', 'multi_select')
    .order('category')
    .order('id')

  if (error) {
    console.error('[offline/questions] DB error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
  }

  // Group by category for easier client-side use
  const grouped: Record<string, typeof questions> = {}
  for (const q of questions ?? []) {
    const cat = q.category as string
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(q)
  }

  return NextResponse.json({
    total: questions?.length ?? 0,
    syncedAt: new Date().toISOString(),
    categories: grouped,
  })
}
