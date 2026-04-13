import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getIdentifier } from '@/lib/ratelimit'
import { saveQuiz } from '@/lib/quiz-store'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Rate limit: 30 quiz starts per IP per hour (fallback in-memory if no Redis)
const ipLimits = new Map<string, { count: number; reset: number }>()
const LIMIT = 30
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

const schema = z.object({
  category: z.enum(['Core', 'Type I', 'Type II', 'Type III', 'Universal']),
  count: z.number().int().min(1).max(100).default(25),
  weakTopics: z.array(z.string()).optional(), // subtopic prefixes to weight more
  mode: z.enum(['practice', 'test']).optional().default('practice'),
})


export async function POST(request: NextRequest) {
  try {
  const ip = getIdentifier(request)
  if (!checkLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { category, count, weakTopics, mode } = parsed.data

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: 'Service unavailable', detail: String(e) }, { status: 503 })
  }

  // STRATIFIED SAMPLING: pick questions evenly across ALL subtopics
  // This ensures every test covers every knowledge area
  let allQuestions: { id: string; category: string; subtopic_id: string; question: string; options: string[]; answer_text: string; difficulty: string }[] = []

  if (category === 'Universal') {
    const cats = ['Core', 'Type I', 'Type II', 'Type III']
    for (const cat of cats) {
      const { data } = await admin
        .from('questions')
        .select('id, category, subtopic_id, question, options, answer_text, difficulty')
        .eq('category', cat)
        .not('question', 'like', 'True or False%')  // Exclude T/F from tests
      if (data) allQuestions.push(...data)
    }
  } else {
    const { data } = await admin
      .from('questions')
      .select('id, category, subtopic_id, question, options, answer_text, difficulty')
      .eq('category', category)
      .not('question', 'like', 'True or False%')  // Exclude T/F from tests
    if (data) allQuestions = data
  }

  if (allQuestions.length === 0) {
    return NextResponse.json({ error: 'No questions available' }, { status: 404 })
  }

  // Group by subtopic prefix (topic group)
  const topicGroups: Record<string, typeof allQuestions> = {}
  for (const q of allQuestions) {
    const topic = (q.subtopic_id || 'general').replace(/-\d+(\.\d+)?$/, '')
    if (!topicGroups[topic]) topicGroups[topic] = []
    topicGroups[topic].push(q)
  }

  // Stratified pick: 1+ question per topic group, then fill remaining randomly
  const picked: typeof allQuestions = []
  const topicKeys = Object.keys(topicGroups)

  // Shuffle topic order
  for (let i = topicKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topicKeys[i], topicKeys[j]] = [topicKeys[j], topicKeys[i]]
  }

  // First pass: 1 random question per topic
  for (const topic of topicKeys) {
    if (picked.length >= count) break
    const pool = topicGroups[topic]
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1) // remove so we don't pick same one again
  }

  // Second pass: fill remaining — weight weak topics in practice mode
  if (picked.length < count) {
    const pickedIds = new Set(picked.map(q => q.id))
    const remaining: typeof allQuestions = []

    // In practice mode with weak topics: fill 40% from weak areas first
    if (mode === 'practice' && weakTopics && weakTopics.length > 0) {
      const weakQuestions: typeof allQuestions = []
      for (const prefix of weakTopics) {
        const pool = topicGroups[prefix]
        if (pool) weakQuestions.push(...pool)
      }
      // Shuffle weak questions
      for (let i = weakQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weakQuestions[i], weakQuestions[j]] = [weakQuestions[j], weakQuestions[i]]
      }
      // Fill up to 40% of remaining slots with weak topic questions
      const weakSlots = Math.floor((count - picked.length) * 0.4)
      for (const q of weakQuestions) {
        if (picked.length >= picked.length + weakSlots) break
        if (!pickedIds.has(q.id)) {
          picked.push(q)
          pickedIds.add(q.id)
        }
      }
    }

    // Fill rest from all topics
    for (const pool of Object.values(topicGroups)) {
      remaining.push(...pool)
    }
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]]
    }
    for (const q of remaining) {
      if (picked.length >= count) break
      if (!pickedIds.has(q.id)) {
        picked.push(q)
        pickedIds.add(q.id)
      }
    }
  }

  const questions = picked

  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
  }

  // Fisher-Yates shuffle question order
  const shuffled = [...questions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Store quiz with answers server-side
  const quizId = randomUUID()
  const answerMap: Record<string, string> = {}
  const subtopicMap: Record<string, string> = {}
  shuffled.forEach(q => {
    answerMap[q.id] = q.answer_text
    subtopicMap[q.id] = q.subtopic_id || 'general'
  })

  await saveQuiz(quizId, {
    questionIds: shuffled.map(q => q.id),
    answers: answerMap,
    category,
    subtopics: subtopicMap,
  })

  // Return questions WITHOUT answer_text — shuffle options per question
  const clientQuestions = shuffled.map(q => {
    const opts = [...q.options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      options: opts,
      difficulty: q.difficulty,
    }
  })

  return NextResponse.json({
    quizId,
    questions: clientQuestions,
    total: clientQuestions.length,
    category,
    timeLimit: category === 'Universal' ? 3600 : 1800,
  })
  } catch (e) {
    console.error('Quiz API error:', e)
    return NextResponse.json({ error: 'Internal error', detail: String(e) }, { status: 500 })
  }
}
