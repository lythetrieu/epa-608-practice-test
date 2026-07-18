// Per-account Study Path progress. RLS ensures each user only ever reads/writes
// their own rows, so we use the SSR (anon-key) client, not the admin client.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TIER_LIMITS, type Tier } from '@/types'
import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'
import { verifyGradeToken } from '@/lib/grade-token'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// The only concept ids a client may write progress for.
const KNOWN_CONCEPT_IDS = new Set(Object.values(SUBTOPIC_TO_CONCEPT).map((c) => c.id))

type SupabaseSSRClient = Awaited<ReturnType<typeof createClient>>

type Row = {
  concept_id: string
  status: string
  pass_count: number
  attempts: number
  best_score: number
  last_score: number | null
  last_passed: string | null
}

// The full guided Study Path (saved progress + mastery tracking) is Pro-only.
// Free users can still browse concepts / try samples via /api/public/study-path.
// If the tier can't be read (missing profile row, etc.) we deny — the write path
// is Pro-only, so failing closed is correct and safe.
async function hasStudyPath(supabase: SupabaseSSRClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users_profile')
    .select('tier')
    .eq('id', userId)
    .single()
  const tier = (data?.tier ?? 'free') as Tier
  return TIER_LIMITS[tier].hasStudyPath
}

// GET → all of the signed-in user's concept progress.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Run the Pro gate check and the progress read concurrently. The 403 gate is
  // still evaluated FIRST below, so a non-Pro user never gets data — we just
  // don't wait serially for the tier lookup before starting the select. RLS
  // already scopes the select to the user's own rows regardless.
  const [allowed, progressRes] = await Promise.all([
    hasStudyPath(supabase, user.id),
    supabase
      .from('study_path_progress')
      .select('concept_id, status, pass_count, attempts, best_score, last_score, last_passed')
      .eq('user_id', user.id),
  ])

  if (!allowed) {
    return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
  }

  const { data, error } = progressRes
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
  const statusRaw = String(body.status ?? 'pending')
  const passCount = Number.isFinite(body.passCount) ? Math.max(0, Math.floor(body.passCount)) : 0
  const lastPassed = body.lastPassed ? String(body.lastPassed) : null
  if (!conceptId) return NextResponse.json({ error: 'missing_concept' }, { status: 400 })

  // Validate against the real concept catalogue. Without this, a crafted body
  // (a 5k-char id, SQL-ish junk) reached the upsert and surfaced as a 500, and
  // any string could create a junk progress row.
  if (!KNOWN_CONCEPT_IDS.has(conceptId)) {
    return NextResponse.json({ error: 'unknown_concept' }, { status: 400 })
  }
  // Only these three are real states; anything else is treated as 'pending'.
  const status = ['pending', 'mastered', 'weak'].includes(statusRaw) ? statusRaw : 'pending'

  // The score of record comes from the SIGNED grade issued by /api/public/score
  // — never from the client's own claim. Without a valid token we still log the
  // attempt (older clients keep working) but the score is not counted and the
  // level can never be marked mastered, so `{lastScore:100,status:'mastered'}`
  // no longer clears a level for free.
  const verified = verifyGradeToken(body.gradeToken)
  const trustedScore = verified ? verified.percentage : null
  const effectiveStatus = status === 'mastered' && (trustedScore ?? 0) < 80 ? 'pending' : status

  // The Pro gate and the current-row read both only need user.id and are read-
  // only, so run them concurrently. The 403 gate is still evaluated BEFORE any
  // write — a non-Pro user never reaches the upsert. The existing-row read is
  // RLS-scoped to the user's own row, so pre-fetching it leaks nothing even if
  // the gate then denies.
  const [allowed, existingRes] = await Promise.all([
    hasStudyPath(supabase, user.id),
    supabase
      .from('study_path_progress')
      .select('attempts, best_score')
      .eq('user_id', user.id)
      .eq('concept_id', conceptId)
      .maybeSingle(),
  ])

  if (!allowed) {
    return NextResponse.json({ error: 'Upgrade required', upgradeRequired: true }, { status: 403 })
  }

  // Current row (RLS: own row) — keeps best_score + attempts authoritative.
  const existing = existingRes.data

  const row: Row & { user_id: string; updated_at: string } = {
    user_id: user.id,
    concept_id: conceptId,
    status: effectiveStatus,
    pass_count: passCount,
    attempts: (existing?.attempts ?? 0) + 1,
    // best/last score move only on a server-signed grade
    best_score: Math.max(existing?.best_score ?? 0, trustedScore ?? 0),
    last_score: trustedScore,
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
