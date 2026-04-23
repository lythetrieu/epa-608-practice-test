import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ─── Schema ──────────────────────────────────────────────────────────────────

const DetailedResultSchema = z.object({
  questionId: z.string().min(1),
  isCorrect: z.boolean(),
  topic: z.string().optional(),
})

const HistoryEntrySchema = z.object({
  type: z.string(),                    // 'core' | 'type-1' etc.
  category: z.string(),               // 'Core' | 'Type I' | 'Type II' | 'Type III'
  score: z.number().int().min(0).max(100),
  date: z.string(),                   // locale date string e.g. '4/21/2026'
  time: z.string().optional(),        // locale time string e.g. '10:30:00 AM'
  detailedResults: z.array(DetailedResultSchema).optional(),
})

const RequestSchema = z.object({
  anonymous_id: z.string().min(1).max(200),
  history: z.array(HistoryEntrySchema).max(200),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a locale date + time string into a UTC ISO string.
 * Falls back to now() if the strings cannot be parsed.
 */
function parseSubmittedAt(date: string, time?: string): string {
  try {
    const combined = time ? `${date} ${time}` : date
    const parsed = new Date(combined)
    if (!isNaN(parsed.getTime())) return parsed.toISOString()
  } catch {
    // ignore
  }
  return new Date().toISOString()
}

/**
 * Map the freebie category string to the canonical DB category value.
 */
function canonicalCategory(raw: string): string {
  const map: Record<string, string> = {
    core: 'Core',
    'type-1': 'Type I',
    'type-2': 'Type II',
    'type-3': 'Type III',
    universal: 'Universal',
    // also accept the display names directly
    'type i': 'Type I',
    'type ii': 'Type II',
    'type iii': 'Type III',
  }
  return map[raw.toLowerCase()] ?? raw
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Authenticate caller
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Parse + validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 422 })
  }

  const { anonymous_id, history } = parsed.data
  const admin = createAdminClient()

  let migratedSessions = 0
  let migratedQuestions = 0

  // 3. Process each history entry
  for (const entry of history) {
    const submittedAt = parseSubmittedAt(entry.date, entry.time)
    const category = canonicalCategory(entry.category)
    const details = entry.detailedResults ?? []

    // Collect question IDs from this entry
    const rawQuestionIds = details.map(d => d.questionId).filter(Boolean)

    // Validate question IDs exist in DB (skip invalid ones to avoid FK violations)
    let validQuestionIds: string[] = []
    if (rawQuestionIds.length > 0) {
      const { data: existingQuestions } = await admin
        .from('questions')
        .select('id')
        .in('id', rawQuestionIds)

      const existingSet = new Set((existingQuestions ?? []).map((q: { id: string }) => q.id))
      validQuestionIds = rawQuestionIds.filter(id => existingSet.has(id))
    }

    // ── Insert test_session ──────────────────────────────────────────────────
    // total = number of questions; score = percentage scaled to total
    const total = validQuestionIds.length > 0 ? validQuestionIds.length : details.length || 1
    // entry.score is a percentage (0-100); convert to absolute count
    const absoluteScore = Math.round((entry.score / 100) * total)

    const { data: insertedSession, error: sessionError } = await admin
      .from('test_sessions')
      .insert({
        user_id: user.id,
        category,
        question_ids: validQuestionIds.length > 0 ? validQuestionIds : rawQuestionIds,
        score: absoluteScore,
        total,
        started_at: submittedAt,   // we don't know exact start time — use submitted_at
        submitted_at: submittedAt,
        is_expired: false,
        time_limit_secs: 1800,
      })
      .select('id')
      .single()

    if (sessionError || !insertedSession) {
      // Non-fatal — continue with remaining entries
      continue
    }

    migratedSessions++

    // ── Insert user_progress rows ────────────────────────────────────────────
    if (details.length > 0 && validQuestionIds.length > 0) {
      const validDetailsSet = new Set(validQuestionIds)
      const progressRows = details
        .filter(d => validDetailsSet.has(d.questionId))
        .map(d => ({
          user_id: user.id,
          question_id: d.questionId,
          correct: d.isCorrect,
          answered_at: submittedAt,
        }))

      if (progressRows.length > 0) {
        // Use upsert-like insert with on_conflict ignore to make this idempotent.
        // user_progress has no unique constraint on (user_id, question_id, answered_at)
        // so a plain insert is fine — duplicates simply produce extra rows which
        // are normal (a user can answer the same question multiple times).
        const { error: progressError } = await admin
          .from('user_progress')
          .insert(progressRows)

        if (!progressError) {
          migratedQuestions += progressRows.length
        }
      }
    }
  }

  // 4. Link anonymous_sessions rows to the authenticated user
  await admin
    .from('anonymous_sessions')
    .update({ user_id: user.id })
    .eq('anonymous_id', anonymous_id)
    .is('user_id', null)   // only claim un-linked rows (idempotent)

  return NextResponse.json({ ok: true, migratedSessions, migratedQuestions })
}
