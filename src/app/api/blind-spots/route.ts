import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { TIER_LIMITS } from '@/lib/tier'
import { getSubtopicLabel, getSubtopicCategory } from '@/lib/subtopics'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const tier = profile.tier as 'free' | 'starter' | 'ultimate'
  if (!TIER_LIMITS[tier].hasBlindSpot) {
    return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: spots, error } = await admin.rpc('get_blind_spots', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('get_blind_spots RPC error:', error)
    return NextResponse.json({ error: 'Failed to load blind spots' }, { status: 500 })
  }

  // Optional category filter
  const categoryFilter = request.nextUrl.searchParams.get('category')

  const enriched = (spots ?? []).map((s: any) => ({
    subtopic_id: s.subtopic_id,
    label: getSubtopicLabel(s.subtopic_id),
    category: getSubtopicCategory(s.subtopic_id),
    totalAttempts: s.total_attempts,
    correctCount: s.correct_count,
    errorRate: s.error_rate,
    lastAttempted: s.last_attempted,
  }))

  const filtered = categoryFilter
    ? enriched.filter((s: any) => s.category === categoryFilter)
    : enriched

  return NextResponse.json(filtered)
}
