// Signed grade tokens.
//
// The quiz is graded server-side by /api/public/score, but the Study Path then
// POSTs the resulting score to /api/study-path/progress from the browser. Left
// unsigned, a user could simply claim `lastScore: 100` and mark every level
// mastered without answering anything (verified: a crafted POST created a
// `core-ozone / mastered / best=100` row).
//
// So /api/public/score now returns a short-lived HMAC over (quizId, percentage)
// and the progress route only trusts a score that arrives inside a valid token.
// Requests without one still record the attempt — they just can never grant
// mastery — which keeps older clients working.

import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 15 * 60 * 1000 // a level takes minutes, not hours

function secret(): string {
  const s = process.env.GRADE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('grade-token: no signing secret configured')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Token format: <quizId>.<percentage>.<issuedAt>.<hmac> */
export function issueGradeToken(quizId: string, percentage: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)))
  const payload = `${quizId}.${pct}.${Date.now()}`
  return `${payload}.${sign(payload)}`
}

export type VerifiedGrade = { quizId: string; percentage: number }

/** Returns the verified grade, or null when absent/tampered/expired. */
export function verifyGradeToken(token: unknown): VerifiedGrade | null {
  if (typeof token !== 'string' || token.length > 500) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [quizId, pctRaw, issuedRaw, mac] = parts

  const payload = `${quizId}.${pctRaw}.${issuedRaw}`
  let expected: string
  try {
    expected = sign(payload)
  } catch {
    return null
  }
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const issued = Number(issuedRaw)
  if (!Number.isFinite(issued) || Date.now() - issued > TTL_MS || issued > Date.now() + 60_000) return null

  const percentage = Number(pctRaw)
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return null

  return { quizId, percentage }
}
