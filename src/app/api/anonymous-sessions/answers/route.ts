import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { corsHeaders } from '@/lib/site-config'
import { anonSessionRateLimit, getIdentifier } from '@/lib/ratelimit'
import { z } from 'zod'

// Per-question answer stream from the marketing test pages (anonymous users).
// The quiz buffers answers client-side and flushes in batches — on finish, on
// pagehide (the abandon case), and every few answers as a safety net — so one
// run costs a handful of requests, not one per question.

export const dynamic = 'force-dynamic'

const MISSING_TABLE = '42P01'

const schema = z.object({
  anonymous_id: z.string().min(8).max(200),
  category: z.string().min(1).max(40),
  exam_total: z.number().int().min(1).max(200),
  answers: z
    .array(
      z.object({
        // questions.id is a text slug ("core-skillcat-plus-new-0011"), not a uuid
        question_id: z.string().min(1).max(120).nullable().optional(),
        position: z.number().int().min(1).max(200),
        correct: z.boolean(),
        time_ms: z.number().int().min(0).max(600000).nullable().optional(),
      }),
    )
    .min(1)
    .max(120),
})

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request)
  const { success } = await anonSessionRateLimit.limit(getIdentifier(request))
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400, headers })

  const { anonymous_id, category, exam_total, answers } = parsed.data
  const admin = createAdminClient()

  const { error } = await admin.from('anonymous_answers').insert(
    answers.map((a) => ({
      anonymous_id,
      category,
      exam_total,
      question_id: a.question_id ?? null,
      position: a.position,
      correct: a.correct,
      time_ms: a.time_ms ?? null,
    })),
  )

  if (error) {
    // Table not migrated yet → succeed quietly so the client keeps flushing;
    // rows before the migration are accepted-and-dropped, not retried forever.
    if (error.code !== MISSING_TABLE) console.warn('anonymous-answers insert:', error.message)
    return NextResponse.json({ ok: true, stored: false }, { headers })
  }

  return NextResponse.json({ ok: true, stored: true }, { headers })
}
