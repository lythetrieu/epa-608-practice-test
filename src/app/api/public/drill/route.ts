import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getIdentifier } from '@/lib/ratelimit'
import { saveQuiz } from '@/lib/quiz-store'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const ipLimits = new Map<string, { count: number; reset: number }>()
function checkLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipLimits.get(ip)
  if (!entry || now > entry.reset) { ipLimits.set(ip, { count: 1, reset: now + 3600000 }); return true }
  if (entry.count >= 30) return false
  entry.count++; return true
}

const schema = z.object({
  weakSubtopics: z.array(z.string()).min(1).max(20),
  count: z.number().int().min(5).max(25).default(10),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getIdentifier(request)
    if (!checkLimit(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { weakSubtopics, count } = parsed.data

    let admin
    try { admin = createAdminClient() } catch { return NextResponse.json({ error: 'Service unavailable' }, { status: 503 }) }

    // Fetch questions matching weak subtopic prefixes
    let allQuestions: { id: string; category: string; subtopic_id: string; question: string; options: string[]; answer_text: string; difficulty: string }[] = []

    for (const prefix of weakSubtopics) {
      const { data } = await admin
        .from('questions')
        .select('id, category, subtopic_id, question, options, answer_text, difficulty')
        .like('subtopic_id', `${prefix}%`)
        .not('question', 'like', 'True or False%')
        .limit(50)
      if (data) allQuestions.push(...data)
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({ error: 'No questions found for these topics' }, { status: 404 })
    }

    // Deduplicate
    const seen = new Set<string>()
    allQuestions = allQuestions.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true })

    // Shuffle + pick
    for (let i = allQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]]
    }
    const picked = allQuestions.slice(0, count)

    // Store quiz
    const quizId = randomUUID()
    const answerMap: Record<string, string> = {}
    const subtopicMap: Record<string, string> = {}
    picked.forEach(q => {
      answerMap[q.id] = q.answer_text
      subtopicMap[q.id] = q.subtopic_id || 'general'
    })

    await saveQuiz(quizId, {
      questionIds: picked.map(q => q.id),
      answers: answerMap,
      category: 'Drill',
      subtopics: subtopicMap,
    })

    // Return without answers, shuffle options
    const clientQuestions = picked.map(q => {
      const opts = [...q.options]
      for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]]
      }
      return { id: q.id, category: q.category, question: q.question, options: opts, difficulty: q.difficulty }
    })

    return NextResponse.json({
      quizId,
      questions: clientQuestions,
      total: clientQuestions.length,
      mode: 'drill',
      targetTopics: weakSubtopics,
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error', detail: String(e) }, { status: 500 })
  }
}
