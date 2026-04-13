import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getIdentifier } from '@/lib/ratelimit'
import { saveQuiz } from '@/lib/quiz-store'
import { SUBTOPIC_TO_CONCEPT } from '@/lib/concept-map'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load micro-lessons (teaching content for each concept)
type MicroLesson = { title: string; lesson: string; keyNumbers: string[]; memoryTrick: string; examWarning: string }
let MICRO_LESSONS: Record<string, MicroLesson> = {}
try {
  const raw = readFileSync(join(process.cwd(), 'src/lib/ai/micro-lessons.json'), 'utf-8')
  MICRO_LESSONS = JSON.parse(raw)
} catch { /* lessons not available */ }

// Load knowledge base for fallback
const KNOWLEDGE_SECTIONS: Record<string, string> = {}
try {
  const kb = readFileSync(join(process.cwd(), 'src/lib/ai/knowledge-base.txt'), 'utf-8')
  const sections = kb.split(/\n## /)
  for (const section of sections) {
    const lines = section.split('\n')
    const title = lines[0]?.replace(/^#+\s*/, '').trim().toUpperCase()
    if (title) {
      KNOWLEDGE_SECTIONS[title] = lines.slice(1).join('\n').trim()
    }
  }
} catch { /* knowledge base not available */ }

const ipLimits = new Map<string, { count: number; reset: number }>()
function checkLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipLimits.get(ip)
  if (!entry || now > entry.reset) { ipLimits.set(ip, { count: 1, reset: now + 3600000 }); return true }
  if (entry.count >= 60) return false
  entry.count++; return true
}

// GET: Return all concepts with their summaries (study path overview)
export async function GET(request: NextRequest) {
  const ip = getIdentifier(request)
  if (!checkLimit(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

  // Build concept list from our mapping
  const concepts = Object.entries(SUBTOPIC_TO_CONCEPT).map(([prefix, info]) => {
    // Find matching knowledge section
    let summary = ''
    for (const [title, content] of Object.entries(KNOWLEDGE_SECTIONS)) {
      if (title.includes(info.title.toUpperCase().split(' ')[0]) ||
          title.includes(info.title.toUpperCase().split('&')[0].trim())) {
        // Extract first 200 words as summary
        summary = content.split(/\s+/).slice(0, 50).join(' ') + '...'
        break
      }
    }

    // Get micro-lesson if available
    const microLesson = MICRO_LESSONS[prefix]

    return {
      id: info.id,
      title: info.title,
      category: info.category,
      subtopicPrefix: prefix,
      summary: summary || `Study material for ${info.title}`,
      lesson: microLesson?.lesson || '',
      keyNumbers: microLesson?.keyNumbers || [],
      memoryTrick: microLesson?.memoryTrick || '',
      examWarning: microLesson?.examWarning || '',
    }
  })

  // Group by category
  const grouped: Record<string, typeof concepts> = {}
  for (const c of concepts) {
    if (!grouped[c.category]) grouped[c.category] = []
    grouped[c.category].push(c)
  }

  return NextResponse.json({
    concepts,
    grouped,
    totalConcepts: concepts.length,
  })
}

// POST: Start a mini-quiz for a specific concept
const quizSchema = z.object({
  conceptPrefix: z.string().min(2).max(20),
  count: z.number().int().min(3).max(10).default(5),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getIdentifier(request)
    if (!checkLimit(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const parsed = quizSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { conceptPrefix, count } = parsed.data

    let admin
    try { admin = createAdminClient() } catch { return NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) }

    // Get concept info
    const conceptInfo = SUBTOPIC_TO_CONCEPT[conceptPrefix]
    if (!conceptInfo) return NextResponse.json({ error: 'Unknown concept' }, { status: 404 })

    // Fetch questions for this concept
    const { data: questions } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, options, answer_text, difficulty')
      .like('subtopic_id', `${conceptPrefix}%`)
      .not('question', 'like', 'True or False%')

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions for this concept' }, { status: 404 })
    }

    // Shuffle and pick
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]]
    }
    const picked = questions.slice(0, count)

    // Store quiz
    const quizId = randomUUID()
    const answerMap: Record<string, string> = {}
    const subtopicMap: Record<string, string> = {}
    picked.forEach(q => {
      answerMap[q.id] = q.answer_text
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
      return { id: q.id, category: q.category, question: q.question, options: opts, difficulty: q.difficulty }
    })

    // Get micro-lesson + fallback to knowledge base
    const microLesson = MICRO_LESSONS[conceptPrefix]
    let conceptSummary = ''
    if (!microLesson) {
      for (const [title, content] of Object.entries(KNOWLEDGE_SECTIONS)) {
        if (title.includes(conceptInfo.title.toUpperCase().split(' ')[0])) {
          conceptSummary = content
          break
        }
      }
    }

    return NextResponse.json({
      quizId,
      concept: conceptInfo,
      lesson: microLesson?.lesson || '',
      keyNumbers: microLesson?.keyNumbers || [],
      memoryTrick: microLesson?.memoryTrick || '',
      examWarning: microLesson?.examWarning || '',
      summary: conceptSummary, // fallback if no lesson
      questions: clientQuestions,
      total: clientQuestions.length,
      mode: 'study',
      passThreshold: 80,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error', detail: String(e) }, { status: 500 })
  }
}
