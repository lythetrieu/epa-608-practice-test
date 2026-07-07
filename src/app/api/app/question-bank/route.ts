import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserProfile } from '@/lib/supabase/auth'
import { questionBankRateLimit } from '@/lib/ratelimit'
import { filterRowsToPool } from '@/lib/question-pool'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Quiz Engine v2 — local question bank download.
//
// Returns the FULL bank the signed-in user is entitled to, INCLUDING
// answer_text / correct_answers / explanation. That is intentional and
// approved: every ACCOUNT (free included) gets the full 569-question bank
// (see TIER_LIMITS — questionPoolLimit is Infinity for all tiers; the gating
// model differentiates Pro by features, not question count). Anonymous users
// never reach this route (middleware 401s /api/app/* + in-route auth check),
// so the "anon must never read the base questions table" rule is preserved —
// the read below runs on the admin client only AFTER auth resolves.
//
// The client caches this payload in localStorage (src/lib/question-bank.ts,
// epa608:lf: prefix → wiped by clearLocalFirstCache() on sign-out) so quizzes
// can start with zero network.

// Bump when the row shape below changes — clients ignore mismatched versions.
const BANK_VERSION = 1

// Exactly the fields quizzes need. Strips admin/meta columns (verified, tags,
// created_at). question_type + correct_answers exist in prod (selected by
// /api/sessions/[id]/submit) but are absent from the checked-in migrations,
// so a legacy fallback below tolerates their absence (42703).
const FULL_COLS =
  'id, category, subtopic_id, question, options, question_type, difficulty, answer_text, correct_answers, explanation, source_ref'
const LEGACY_COLS =
  'id, category, subtopic_id, question, options, difficulty, answer_text, explanation, source_ref'

// Postgres "undefined column"
const UNDEFINED_COLUMN = '42703'

type BankRow = {
  id: string
  category: string
  subtopic_id: string | null
  question: string
  options: string[]
  question_type?: string | null
  difficulty: string
  answer_text: string
  correct_answers?: string[] | null
  explanation: string
  source_ref: string
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit keyed by user id (authenticated route — limits follow the
  // account, not the IP). Generous: the payload is fetched roughly daily.
  const [{ success: ok }, profile] = await Promise.all([
    questionBankRateLimit.limit(`bank:${user.id}`),
    getUserProfile(user.id),
  ])
  if (!ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const admin = createAdminClient()

  // Same safe read mechanism as /api/questions: service-role client, verified
  // rows only, AFTER the auth gate above.
  const full = await admin
    .from('questions')
    .select(FULL_COLS)
    .eq('verified', true)
    .order('id', { ascending: true })

  let rows = full.data as unknown as BankRow[] | null
  let error = full.error

  if (error?.code === UNDEFINED_COLUMN) {
    // question_type / correct_answers not ALTERed in yet — degrade gracefully.
    const legacy = await admin
      .from('questions')
      .select(LEGACY_COLS)
      .eq('verified', true)
      .order('id', { ascending: true })
    rows = legacy.data as unknown as BankRow[] | null
    error = legacy.error
  }

  if (error || !rows) {
    return NextResponse.json({ error: 'Failed to load question bank' }, { status: 500 })
  }

  // Belt-and-braces entitlement guard, mirroring /api/questions: reduce to the
  // free pool when the tier is pool-limited. With today's TIER_LIMITS
  // (questionPoolLimit: Infinity for every tier) this is a no-op — all
  // accounts get the full bank — but if the free pool is ever reinstated the
  // bank download automatically respects it.
  const tier = profile?.tier ?? 'free' // missing profile row → fail closed (no-op today: free = full bank)
  const pooled = filterRowsToPool(rows, tier)

  const questions = pooled.map((r) => ({
    id: r.id,
    category: r.category,
    subtopic_id: r.subtopic_id,
    question: r.question,
    options: r.options,
    question_type: r.question_type ?? null,
    difficulty: r.difficulty,
    answer_text: r.answer_text,
    correct_answers: r.correct_answers ?? null,
    explanation: r.explanation,
    source_ref: r.source_ref,
  }))

  return NextResponse.json(
    { v: BANK_VERSION, fetchedAt: new Date().toISOString(), questions },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
