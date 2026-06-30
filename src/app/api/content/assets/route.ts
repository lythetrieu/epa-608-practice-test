// GET /api/content/assets?conceptId=<id>
// Lists learning assets for a concept. Auth via cookie OR Bearer (mobile-ready).
// Degrades gracefully: if the learning_assets table has not been created yet
// (migration not run), returns { assets: [] } instead of 500.

import { NextRequest, NextResponse } from 'next/server'
import { authFromRequest } from '@/lib/supabase/auth-from-request'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Postgres "undefined table" — table doesn't exist yet (migration not run).
const UNDEFINED_TABLE = '42P01'

export async function GET(request: NextRequest) {
  const { supabase, user } = await authFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const conceptId = request.nextUrl.searchParams.get('conceptId')?.trim()
  if (!conceptId) return NextResponse.json({ error: 'missing_concept' }, { status: 400 })

  const { data, error } = await supabase
    .from('learning_assets')
    .select('id, concept_id, type, title, url, thumbnail_url, duration_sec, sort_order, is_pro')
    .eq('concept_id', conceptId)
    .order('sort_order', { ascending: true })

  if (error) {
    // Table missing → behave as "no assets yet" rather than erroring the client.
    if (error.code === UNDEFINED_TABLE) return NextResponse.json({ assets: [] })
    console.error('content/assets GET:', error)
    return NextResponse.json({ assets: [] })
  }

  const assets = (data ?? []).map((a) => ({
    id: a.id,
    conceptId: a.concept_id,
    type: a.type,
    title: a.title,
    url: a.url,
    thumbnailUrl: a.thumbnail_url,
    durationSec: a.duration_sec,
    sortOrder: a.sort_order,
    isPro: a.is_pro,
  }))

  return NextResponse.json({ assets })
}
