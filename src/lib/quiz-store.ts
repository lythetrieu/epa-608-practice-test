import { Redis } from '@upstash/redis'

export type QuizData = {
  questionIds: string[]
  answers: Record<string, string>
  category: string
  subtopics: Record<string, string>
}

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!redis) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL.trim(),
        token: process.env.UPSTASH_REDIS_REST_TOKEN.trim(),
      })
    } catch {
      return null
    }
  }
  return redis
}

// globalThis-pinned so the in-memory fallback survives module re-evaluation
// (Next dev HMR / separate route bundles share one Map; also a safety net if
// Redis is briefly unavailable in prod).
const fallbackStore: Map<string, QuizData> =
  (globalThis as unknown as { __quizFallbackStore?: Map<string, QuizData> }).__quizFallbackStore ??
  ((globalThis as unknown as { __quizFallbackStore?: Map<string, QuizData> }).__quizFallbackStore = new Map<string, QuizData>())

export async function saveQuiz(quizId: string, data: QuizData): Promise<void> {
  const r = getRedis()
  if (r) {
    try {
      await r.set(`quiz:${quizId}`, JSON.stringify(data), { ex: 3600 })
      return
    } catch { /* fallback */ }
  }
  fallbackStore.set(quizId, data)
}

export async function getQuiz(quizId: string): Promise<QuizData | null> {
  const r = getRedis()
  if (r) {
    try {
      const raw = await r.get(`quiz:${quizId}`)
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw as QuizData
    } catch { /* fallback */ }
  }
  return fallbackStore.get(quizId) || null
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const r = getRedis()
  if (r) {
    try { await r.del(`quiz:${quizId}`) } catch { /* ignore */ }
  }
  fallbackStore.delete(quizId)
}
