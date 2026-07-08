import type { Category } from '@/types'

// EPA 608 pass marks — mirrors the scoring in
// src/app/api/sessions/[sessionId]/submit/route.ts and /api/app/submit:
// real proctored exam is 25Q/section, pass = 72% for every section (Universal
// = every section >= 72%); 84% applies only to the mail-in open-book Type I
// path, which we don't simulate.
export const PASS_THRESHOLD: Record<string, number> = {
  Core: 72,
  'Type I': 72,
  'Type II': 72,
  'Type III': 72,
  Universal: 72,
}

export type CatReadiness = {
  category: string
  avgPct: number        // recency-weighted average of recent scores
  threshold: number     // pass mark for this cert
  readinessPct: number  // 0–100: how close to the pass mark (100 = at/above)
  ready: boolean        // avgPct >= threshold
  attempts: number
}

export type Readiness = {
  overall: number                 // 0–100, attempt-weighted across attempted certs
  byCategory: CatReadiness[]
  enoughData: boolean             // false → prompt "take a few tests first"
  confidence: 'low' | 'medium' | 'high'
  weakest: CatReadiness | null    // lowest readiness among attempted certs (coach focus)
}

type Session = { category: string; score: number | null; total: number; submitted_at?: string | null }

/**
 * Honest exam-readiness: for each cert the user pursues, take their recent
 * scores (newest weighted most) and measure them against the REAL proctored
 * pass mark (72% per section). readinessPct = avg / threshold, capped at 100.
 * Overall is attempt-weighted so a cert you've barely touched doesn't dominate.
 *
 * `sessions` must be newest-first (dashboard already orders by submitted_at desc).
 */
export function computeReadiness(sessions: Session[], pursue: (Category | 'Universal' | string)[]): Readiness {
  const byCat: Record<string, Session[]> = {}
  for (const s of sessions) {
    if (s.score === null) continue
    ;(byCat[s.category] ??= []).push(s)
  }

  const byCategory: CatReadiness[] = []
  let totalAttempts = 0
  for (const category of pursue) {
    const list = (byCat[category] ?? []).slice(0, 6) // most recent 6
    if (!list.length) continue
    let wSum = 0
    let wTotal = 0
    list.forEach((s, i) => {
      const weight = 1 / (i + 1) // newest first → 1, 1/2, 1/3, …
      wSum += ((s.score! / s.total) * 100) * weight
      wTotal += weight
    })
    const avgPct = Math.round(wSum / wTotal)
    const threshold = PASS_THRESHOLD[category] ?? 72
    const readinessPct = Math.max(0, Math.min(100, Math.round((avgPct / threshold) * 100)))
    byCategory.push({ category, avgPct, threshold, readinessPct, ready: avgPct >= threshold, attempts: list.length })
    totalAttempts += list.length
  }

  let ov = 0
  let ow = 0
  for (const c of byCategory) {
    ov += c.readinessPct * c.attempts
    ow += c.attempts
  }
  const overall = ow > 0 ? Math.round(ov / ow) : 0

  const weakest = byCategory.length
    ? byCategory.reduce((min, c) => (c.readinessPct < min.readinessPct ? c : min))
    : null

  const confidence = totalAttempts >= 10 ? 'high' : totalAttempts >= 4 ? 'medium' : 'low'

  return { overall, byCategory, enoughData: totalAttempts >= 3, confidence, weakest }
}
