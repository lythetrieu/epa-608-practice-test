// Per-account Study Path progress. RLS ensures each user only ever reads/writes
// their own rows, so we use the SSR (anon-key) client, not the admin client.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Row = {
  concept_id: string
  status: string
  pass_count: number
  attempts: number
  best_score: number
  last_score: number | null
  last_passed: string | null
}

// GET → all of the signed-in user's concept progress.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('study_path_progress')
    .select('concept_id, status, pass_count, attempts, best_score, last_score, last_passed')
    .eq('user_id', user.id)

  if (error) {
    console.error('study-path progress GET:', error)
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }
  return NextResponse.json({ progress: data ?? [] })
}

// POST → upsert one concept's result. Server keeps best_score / attempts authoritative.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const conceptId = String(body.conceptId ?? '').trim()
  const status = String(body.status ?? 'pending')
  const passCount = Number.isFinite(body.passCount) ? Math.max(0, Math.floor(body.passCount)) : 0
  const lastScore = Number.isFinite(body.lastScore) ? Math.max(0, Math.min(100, Math.floor(body.lastScore))) : null
  const lastPassed = body.lastPassed ? String(body.lastPassed) : null
  if (!conceptId) return NextResponse.json({ error: 'missing_concept' }, { status: 400 })

  // Read current row (RLS: own row) to keep best_score + attempts authoritative.
  const { data: existing } = await supabase
    .from('study_path_progress')
    .select('attempts, best_score')
    .eq('user_id', user.id)
    .eq('concept_id', conceptId)
    .maybeSingle()

  const row: Row & { user_id: string; updated_at: string } = {
    user_id: user.id,
    concept_id: conceptId,
    status,
    pass_count: passCount,
    attempts: (existing?.attempts ?? 0) + 1,
    best_score: Math.max(existing?.best_score ?? 0, lastScore ?? 0),
    last_score: lastScore,
    last_passed: lastPassed,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('study_path_progress')
    .upsert(row, { onConflict: 'user_id,concept_id' })

  if (error) {
    console.error('study-path progress POST:', error)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, best_score: row.best_score, attempts: row.attempts })
}
