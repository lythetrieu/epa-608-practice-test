// /api/content/engagement — per-user content engagement tracking.
// Auth via cookie OR Bearer (mobile-ready). RLS keeps each user to their rows.
//
// POST { assetId, action, progressPct?, secondsSpent? } → upsert on
//   (user_id, asset_id), keeping max(progress_pct). Returns { ok: true }.
// GET → { engagement: [{ assetId, action, progressPct, secondsSpent, lastAt }] }
//
// Degrades gracefully if content_engagement is missing (migration not run):
// POST silently no-ops { ok: true }, GET returns { engagement: [] }.

import { NextRequest, NextResponse } from 'next/server'
import { authFromRequest } from '@/lib/supabase/auth-from-request'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UNDEFINED_TABLE = '42P01'

const postSchema = z.object({
  assetId: z.string().min(1),
  action: z.enum(['view', 'complete']),
  progressPct: z.number().int().min(0).max(100).optional(),
  secondsSpent: z.number().int().min(0).optional(),
})

export async function GET(request: NextRequest) {
  const { supabase, user } = await authFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('content_engagement')
    .select('asset_id, action, progress_pct, seconds_spent, last_at')
    .eq('user_id', user.id)

  if (error) {
    if (error.code === UNDEFINED_TABLE) return NextResponse.json({ engagement: [] })
    console.error('content/engagement GET:', error)
    return NextResponse.json({ engagement: [] })
  }

  const engagement = (data ?? []).map((r) => ({
    assetId: r.asset_id,
    action: r.action,
    progressPct: r.progress_pct,
    secondsSpent: r.seconds_spent,
    lastAt: r.last_at,
  }))

  return NextResponse.json({ engagement })
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await authFromRequest(request)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const { assetId, action, progressPct, secondsSpent } = parsed.data

  // Read existing row (RLS: own row) to keep max(progress_pct) authoritative.
  const { data: existing, error: readError } = await supabase
    .from('content_engagement')
    .select('progress_pct, seconds_spent')
    .eq('user_id', user.id)
    .eq('asset_id', assetId)
    .maybeSingle()

  if (readError && readError.code === UNDEFINED_TABLE) {
    // Table not created yet → silent no-op so the client never breaks.
    return NextResponse.json({ ok: true })
  }

  const nextProgress = Math.max(existing?.progress_pct ?? 0, progressPct ?? 0)
  const nextSeconds = (existing?.seconds_spent ?? 0) + (secondsSpent ?? 0)

  const { error } = await supabase
    .from('content_engagement')
    .upsert(
      {
        user_id: user.id,
        asset_id: assetId,
        action,
        progress_pct: nextProgress,
        seconds_spent: nextSeconds,
        last_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,asset_id' },
    )

  if (error) {
    if (error.code === UNDEFINED_TABLE) return NextResponse.json({ ok: true })
    console.error('content/engagement POST:', error)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
