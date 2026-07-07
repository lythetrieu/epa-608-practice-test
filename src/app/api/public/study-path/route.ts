import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getIdentifier } from '@/lib/ratelimit'
import { saveQuiz } from '@/lib/quiz-store'
import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'
import { buildStudyPathConcepts, groupConceptsByCategory } from '@/lib/study-path-data'
import { canonicalMulti, isMulti } from '@/lib/multi'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load micro-lessons (teaching content for each concept). Used only by POST —
// the GET concept overview now comes from the shared buildStudyPathConcepts().
type MicroLesson = { title: string; lesson: string; keyNumbers: string[]; memoryTrick: string; examWarning: string }
let MICRO_LESSONS: Record<string, MicroLesson> = {}
try {
  const raw = readFileSync(join(process.cwd(), 'src/lib/ai/micro-lessons.json'), 'utf-8')
  MICRO_LESSONS = JSON.parse(raw)
} catch { /* lessons not available */ }

// Load knowledge base and extract facts per section (used by POST's getFactsForConcept)
const KB_FACTS: Record<string, string[]> = {} // section title → array of fact strings
try {
  const kb = readFileSync(join(process.cwd(), 'src/lib/ai/knowledge-base.txt'), 'utf-8')
  const sections = kb.split(/\n## /)
  for (const section of sections) {
    const lines = section.split('\n')
    const title = lines[0]?.replace(/^#+\s*/, '').trim().toUpperCase()
    if (title) {
      KB_FACTS[title] = lines.slice(1).filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''))
    }
  }
} catch { /* knowledge base not available */ }

// Map concept prefixes → KB section titles (many-to-many)
const CONCEPT_TO_KB: Record<string, string[]> = {
  'core-env': ['ENVIRONMENT & OZONE DEPLETION'],
  'core-caa': ['CLEAN AIR ACT & EPA AUTHORITY'],
  'core-regs': ['REGULATIONS & COMPLIANCE'],
  'core-sub': ['REFRIGERANT SUBSTANCES & SUBSTITUTES'],
  'core-ref': ['REFRIGERANT PROPERTIES & TOOLS'],
  'core-3rs': ['RECOVERY, RECYCLING & RECLAMATION'],
  'core-rec': ['RECOVERY EQUIPMENT & PROCEDURES'],
  'core-evac': ['EVACUATION PROCEDURES & VACUUM'],
  'core-safe': ['SAFETY & REFRIGERANT HANDLING'],
  'core-ship': ['SHIPPING, DISPOSAL & TRANSPORT'],
  't1-rec': ['SMALL APPLIANCE RECOVERY'],
  't1-tech': ['SMALL APPLIANCE RECOVERY'],
  't1-safe': ['SMALL APPLIANCE RECOVERY'],
  't2-leak': ['HIGH-PRESSURE RECOVERY & SERVICE'],
  't2-repair': ['HIGH-PRESSURE RECOVERY & SERVICE'],
  't2-rec': ['HIGH-PRESSURE RECOVERY & SERVICE'],
  't2-tech': ['HIGH-PRESSURE RECOVERY & SERVICE'],
  't2-ref': ['HIGH-PRESSURE RECOVERY & SERVICE', 'REFRIGERANT PROPERTIES & TOOLS'],
  't3-leak': ['LOW-PRESSURE CHILLER RECOVERY'],
  't3-repair': ['LOW-PRESSURE CHILLER RECOVERY'],
  't3-rec': ['LOW-PRESSURE CHILLER RECOVERY'],
  't3-rech': ['LOW-PRESSURE CHILLER RECOVERY'],
  't3-ref': ['LOW-PRESSURE CHILLER RECOVERY', 'REFRIGERANT PROPERTIES & TOOLS'],
}

function getFactsForConcept(prefix: string): string[] {
  const kbSections = CONCEPT_TO_KB[prefix] || []
  const allFacts: string[] = []
  for (const section of kbSections) {
    const facts = KB_FACTS[section] || []
    allFacts.push(...facts)
  }
  return allFacts
}

const ipLimits = new Map<string, { count: number; reset: number }>()
function checkLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipLimits.get(ip)
  if (!entry || now > entry.reset) { ipLimits.set(ip, { count: 1, reset: now + 3600000 }); return true }
  if (entry.count >= 60) return false
  entry.count++; return true
}

// GET: Return all concepts with their summaries (study path overview).
// The concept list is PURELY LOCAL (concept-map + micro-lessons + knowledge
// base) and identical for every caller, so it's cacheable at the CDN. The
// server component on /learn calls buildStudyPathConcepts() directly and skips
// this fetch entirely; mobile clients still hit this endpoint.
export async function GET(request: NextRequest) {
  const ip = getIdentifier(request)
  if (!checkLimit(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  // Shared local computation (also used server-side by /learn/page.tsx)
  const concepts = buildStudyPathConcepts()
  const grouped = groupConceptsByCategory(concepts)

  return NextResponse.json(
    {
      concepts,
      grouped,
      totalConcepts: concepts.length,
    },
    {
      // Static-ish content: cache at the edge for 1h, serve stale for 24h while
      // revalidating. Mobile clients still call this route.
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}

// POST: Start a mini-quiz for a specific concept.
//
// Quiz Engine v2: `questionIds` (optional) registers a CLIENT-picked quiz —
// the local-bank Study Path start (src/lib/question-bank.ts) renders its
// questions instantly on-device, then calls this in the background purely to
// obtain a quizId so the unchanged /api/public/score grading flow works. The
// ids must all belong to the concept (same LIKE filter as the random pick) and
// the ANSWERS are still looked up server-side — the client never supplies them,
// so grading integrity is identical to a server-picked quiz.
const quizSchema = z.object({
  conceptPrefix: z.string().min(2).max(20),
  count: z.number().int().min(3).max(10).default(5),
  questionIds: z.array(z.string().min(1).max(100)).min(3).max(10).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getIdentifier(request)
    if (!checkLimit(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const parsed = quizSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { conceptPrefix, count, questionIds } = parsed.data

    let admin
    try { admin = createAdminClient() } catch { return NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) }

    // Get concept info
    const conceptInfo = SUBTOPIC_TO_CONCEPT[conceptPrefix]
    if (!conceptInfo) return NextResponse.json({ error: 'Unknown concept' }, { status: 404 })

    // Fetch questions for this concept
    const { data: questions } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, options, answer_text, difficulty, question_type, correct_answers')
      .like('subtopic_id', `${conceptPrefix}-%`)

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions for this concept' }, { status: 404 })
    }

    let picked = questions
    if (questionIds && questionIds.length > 0) {
      // Client-picked registration: every id must be a distinct question of
      // THIS concept (already fetched via the LIKE filter above) or the whole
      // request is rejected — no cross-concept or unknown ids.
      const byId = new Map(questions.map(q => [q.id, q]))
      const chosen = questionIds.flatMap(id => {
        const q = byId.get(id)
        return q ? [q] : []
      })
      if (chosen.length !== questionIds.length || new Set(questionIds).size !== questionIds.length) {
        return NextResponse.json({ error: 'Invalid question ids' }, { status: 400 })
      }
      picked = chosen
    } else {
      // Shuffle and pick
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]]
      }
      picked = questions.slice(0, count)
    }

    // Store quiz
    const quizId = randomUUID()
    const answerMap: Record<string, string> = {}
    const subtopicMap: Record<string, string> = {}
    picked.forEach(q => {
      // multi-select: store canonical set so the existing === scorer works
      answerMap[q.id] = isMulti(q.question_type)
        ? canonicalMulti(q.correct_answers as string[])
        : q.answer_text
      subtopicMap[q.id] = q.subtopic_id || conceptPrefix
    })

    await saveQuiz(quizId, {
      questionIds: picked.map(q => q.id),
      answers: answerMap,
      category: conceptInfo.category,
      subtopics: subtopicMap,
    })

    // Return without answers
    const clientQuestions = picked.map(q => {
      const opts = [...q.options]
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]]
      }
      return { id: q.id, category: q.category, question: q.question, options: opts, difficulty: q.difficulty, question_type: q.question_type }
    })

    // Get micro-lesson + ALL knowledge base facts for this concept
    const microLesson = MICRO_LESSONS[conceptPrefix]
    const facts = getFactsForConcept(conceptPrefix)

    return NextResponse.json({
      quizId,
      concept: { ...conceptInfo, subtopicPrefix: conceptPrefix },
      lesson: microLesson?.lesson || '',
      keyNumbers: microLesson?.keyNumbers || [],
      memoryTrick: microLesson?.memoryTrick || '',
      examWarning: microLesson?.examWarning || '',
      facts, // ALL knowledge base facts for this concept
      questions: clientQuestions,
      total: clientQuestions.length,
      mode: 'study',
      passThreshold: 80,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error', detail: String(e) }, { status: 500 })
  }
}
