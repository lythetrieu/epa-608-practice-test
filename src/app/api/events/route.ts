// POST /api/events — append-only learning telemetry (fire-and-forget).
// Auth via cookie OR Bearer (mobile-ready).
//
// body: { events: [{ eventType, ts?, conceptId?, questionId?, assetId?,
//                     sessionId?, payload? }] }  (max 50)
//
// Semantics: validate, insert into learning_events, and ALWAYS return
// { ok: true } — even on insert error or missing table. This route must NEVER
// block or surface an error to the client; failures are logged only.

import { NextRequest, NextResponse } from 'next/server'
import { authFromRequest } from '@/lib/supabase/auth-from-request'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const UNDEFINED_TABLE = '42P01'

const eventSchema = z.object({
  eventType: z.string().min(1).max(100),
  ts: z.string().optional(),
  conceptId: z.string().optional(),
  questionId: z.string().optional(),
  assetId: z.string().optional(),
  sessionId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
})

const schema = z.object({
  events: z.array(eventSchema).min(1).max(50),
})

export async function POST(request: NextRequest) {
  const { supabase, user } = await authFromRequest(request)
  // Telemetry is best-effort; an unauthenticated caller is simply dropped.
  if (!user) return NextResponse.json({ ok: true })

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  // Invalid payloads are dropped silently — never error the client.
  if (!parsed.success) return NextResponse.json({ ok: true })

  const rows = parsed.data.events.map((e) => ({
    user_id: user.id,
    event_type: e.eventType,
    ...(e.ts ? { ts: e.ts } : {}),
    concept_id: e.conceptId ?? null,
    question_id: e.questionId ?? null,
    asset_id: e.assetId ?? null,
    session_id: e.sessionId ?? null,
    payload: e.payload ?? {},
  }))

  const { error } = await supabase.from('learning_events').insert(rows)
  if (error && error.code !== UNDEFINED_TABLE) {
    // Log and swallow — telemetry must not fail the request.
    console.error('events POST insert:', error)
  }

  return NextResponse.json({ ok: true })
}
