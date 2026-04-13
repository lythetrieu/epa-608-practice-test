import { NextRequest, NextResponse } from 'next/server'
import { getIdentifier } from '@/lib/ratelimit'
import { z } from 'zod'
import { getQuiz, deleteQuiz } from '@/lib/quiz-store'
import { buildConceptBreakdown } from '@/lib/concept-map'

// Rate limit: 30 scores per IP per hour
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
  quizId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
})

export async function POST(request: NextRequest) {
  const ip = getIdentifier(request)
  if (!checkLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { quizId, answers } = parsed.data

  const quiz = await getQuiz(quizId)
  if (!quiz) {
    return NextResponse.json({
      error: 'Quiz expired or not found. Start a new test.',
      expired: true,
    }, { status: 404 })
  }

  // Score server-side
  let score = 0
  const results: {
    questionId: string
    correct: boolean
    userAnswer: string | null
    correctAnswer: string
  }[] = []

  const subtopicStats: Record<string, { correct: number; total: number }> = {}

  for (const qId of quiz.questionIds) {
    const correctAnswer = quiz.answers[qId]
    const userAnswer = answers[qId] || null
    const isCorrect = userAnswer === correctAnswer

    if (isCorrect) score++

    results.push({
      questionId: qId,
      correct: isCorrect,
      userAnswer,
      correctAnswer,
    })

    const subtopic = quiz.subtopics[qId] || 'general'
    const topicGroup = subtopic.replace(/-\d+(\.\d+)?$/, '')
    if (!subtopicStats[topicGroup]) subtopicStats[topicGroup] = { correct: 0, total: 0 }
    subtopicStats[topicGroup].total++
    if (isCorrect) subtopicStats[topicGroup].correct++
  }

  const total = quiz.questionIds.length
  const percentage = Math.round((score / total) * 100)

  let passed: boolean
  if (quiz.category === 'Type I') {
    passed = percentage >= 84
  } else {
    passed = percentage >= 70
  }

  const weakAreas: { topic: string; accuracy: number; prefix: string }[] = []
  const strongAreas: { topic: string; accuracy: number }[] = []

  for (const [topic, stats] of Object.entries(subtopicStats)) {
    const acc = Math.round((stats.correct / stats.total) * 100)
    const label = topic
      .replace('core-', '').replace('t1-', '').replace('t2-', '').replace('t3-', '')
      .replace(/-/g, ' ')
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1)

    if (acc < 60) weakAreas.push({ topic: capitalized, accuracy: acc, prefix: topic })
    else strongAreas.push({ topic: capitalized, accuracy: acc })
  }

  weakAreas.sort((a, b) => a.accuracy - b.accuracy)
  strongAreas.sort((a, b) => b.accuracy - a.accuracy)

  // Track per-question difficulty (async, non-blocking)
  // Stores: question_id → {attempts, correct} in Redis for calibration
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: (process.env.UPSTASH_REDIS_REST_URL || '').trim(),
      token: (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim(),
    })
    const pipeline = redis.pipeline()
    for (const qId of quiz.questionIds) {
      const correct = answers[qId] === quiz.answers[qId]
      pipeline.hincrby(`qstats:${qId}`, 'attempts', 1)
      if (correct) pipeline.hincrby(`qstats:${qId}`, 'correct', 1)
    }
    pipeline.exec().catch(() => {}) // fire-and-forget
  } catch { /* Redis unavailable, skip tracking */ }

  // Build concept-level breakdown from subtopic data
  const conceptResults = quiz.questionIds.map(qId => ({
    subtopicId: quiz.subtopics[qId] || 'general',
    correct: answers[qId] === quiz.answers[qId],
  }))
  const conceptData = buildConceptBreakdown(conceptResults)

  // Delete quiz (one-time use)
  await deleteQuiz(quizId)

  return NextResponse.json({
    score, total, percentage, passed,
    category: quiz.category,
    results, weakAreas, strongAreas,
    conceptBreakdown: conceptData.concepts.filter(c => c.total > 0),
    conceptsMastered: conceptData.conceptsMastered,
    conceptsWeak: conceptData.conceptsWeak,
    conceptsNotTested: conceptData.conceptsNotTested,
  })
}
