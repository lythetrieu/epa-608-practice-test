import { NextRequest, NextResponse } from 'next/server'
import { getIdentifier } from '@/lib/ratelimit'
import { z } from 'zod'
import { buildConceptBreakdown, SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'

// Rate limit: 60 requests per IP per hour
const ipLimits = new Map<string, { count: number; reset: number }>()
const LIMIT = 60
const WINDOW = 3600000

function checkLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipLimits.get(ip)
  if (!entry || now > entry.reset) {
    ipLimits.set(ip, { count: 1, reset: now + WINDOW })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

const resultSchema = z.object({
  questionId: z.string(),
  correct: z.boolean(),
  subtopicId: z.string().optional(),
})

const schema = z.object({
  results: z.array(resultSchema).min(1).max(200),
})

/**
 * POST /api/public/concepts
 *
 * Public (no auth) endpoint that takes quiz results and returns
 * concept-level coverage analysis. Used by the results page to show
 * which concepts the user has mastered vs needs work.
 *
 * Body: { results: [{ questionId, correct, subtopicId? }] }
 *
 * The subtopicId on each result is required to map questions to concepts.
 * If not provided, that question is skipped in concept analysis.
 */
export async function POST(request: NextRequest) {
  const ip = getIdentifier(request)
  if (!checkLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { results } = parsed.data

  // Build concept breakdown from results
  const mappedResults = results
    .filter(r => r.subtopicId)
    .map(r => ({ subtopicId: r.subtopicId!, correct: r.correct }))

  const breakdown = buildConceptBreakdown(mappedResults)

  // Filter to only concepts that are relevant (tested or in same category)
  // Return all concepts so the UI can show full coverage
  return NextResponse.json({
    concepts: breakdown.concepts,
    overallMastery: breakdown.overallMastery,
    weakConcepts: breakdown.weakConcepts,
    notTestedConcepts: breakdown.notTestedConcepts,
    conceptsMastered: breakdown.conceptsMastered,
    conceptsWeak: breakdown.conceptsWeak,
    conceptsNotTested: breakdown.conceptsNotTested,
    totalConcepts: Object.keys(SUBTOPIC_TO_CONCEPT).length,
  })
}
