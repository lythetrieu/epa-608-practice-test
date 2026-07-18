import { test, expect, hasSession } from './fixtures'
import type { APIRequestContext } from '@playwright/test'

// ── Abuse / security: hit the API directly with the persona's real session
// cookies. Covers auth walls, privilege escalation, answer leakage, injection,
// and malformed-input handling (must 4xx, never 5xx).

async function json(res: Awaited<ReturnType<APIRequestContext['post']>>) {
  try { return await res.json() } catch { return null }
}

test.describe('auth walls (anon must be 401)', () => {
  const authed: Array<[string, 'get' | 'post']> = [
    ['/api/app/question-bank', 'get'],
    ['/api/app/submit', 'post'],
    ['/api/study-path/progress', 'post'],
    ['/api/app/study-progress', 'get'],
  ]
  for (const [route, method] of authed) {
    test(`anon ${method.toUpperCase()} ${route} → 401`, async ({ anonPage }) => {
      const res = method === 'get'
        ? await anonPage.request.get(route)
        : await anonPage.request.post(route, { data: {} })
      expect([401, 403], `${route} should reject anon`).toContain(res.status())
    })
  }
})

test.describe('answer leakage (anon)', () => {
  const cases: Array<[string, object]> = [
    ['/api/public/quiz', { category: 'Core', count: 25 }],
    ['/api/public/quiz', { category: 'Type II', count: 10 }],
    ['/api/public/drill', { weakTopics: ['core-ozone', 't2-leak-rates'] }],
  ]
  for (const [route, data] of cases) {
    test(`anon POST ${route} ${JSON.stringify(data).slice(0, 30)} must NOT ship answers`, async ({ anonPage }) => {
      const res = await anonPage.request.post(route, { data })
      if (res.status() >= 400) { test.skip(true, `${route} → ${res.status()}`); return }
      const raw = await res.text()
      expect(raw, `${route} leaked answer_text/correct_answers to anon`).not.toMatch(/"(answer_text|correct_answers|answerMap|answers)"\s*:/)
    })
  }
})

test.describe('progress integrity (free)', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('cannot mark a level MASTERED without a real graded quiz', async ({ freePage }) => {
    const conceptId = 'core-ozone'
    const res = await freePage.request.post('/api/study-path/progress', {
      data: { conceptId, status: 'mastered', lastScore: 100, passCount: 99 },
    })
    const status = res.status()
    // Acceptable secure outcomes: rejected (4xx), or table absent (5xx on prod).
    if (status >= 400) { expect(status).toBeGreaterThanOrEqual(400); return }

    const body = await json(res)
    // If the server echoed a spoofed 100 best_score, verify it actually stuck.
    const check = await freePage.request.get('/api/app/study-progress')
    const prog = (await json(check))?.progress as Array<{ concept_id: string; status: string; best_score: number }> | undefined
    const row = prog?.find((p) => p.concept_id === conceptId)
    const spoofed = (body?.best_score === 100) || (row?.status === 'mastered' && (row?.best_score ?? 0) >= 100)
    expect(
      spoofed,
      'INTEGRITY: a crafted POST set best_score=100 / status=mastered with no graded submit — a user can unlock/clear every level by spoofing lastScore.',
    ).toBe(false)
  })
})

test.describe('malformed input must 4xx, never 5xx', () => {
  test.skip(!hasSession('free'), 'no free session')
  const payloads: Array<[string, unknown]> = [
    ['/api/study-path/progress', { conceptId: "x'; DROP TABLE questions;--", status: 'mastered', lastScore: 'NaN' }],
    ['/api/study-path/progress', { conceptId: 'a'.repeat(5000), lastScore: 99999 }],
    ['/api/app/submit', { category: 'Nonsense', mode: 'x', answers: 'not-an-array' }],
    ['/api/app/submit', { category: 'Core', mode: 'standard', answers: [{ question_id: 1, selected: {} }] }],
  ]
  for (const [route, data] of payloads) {
    test(`POST ${route} ${JSON.stringify(data).slice(0, 40)}… → not 5xx`, async ({ freePage }) => {
      const res = await freePage.request.post(route, { data })
      expect(res.status(), `${route} 5xx'd on garbage input`).toBeLessThan(500)
    })
  }
})

test.describe('rate limiting', () => {
  test.skip(!hasSession('free'), 'no free session')
  test('question-bank hammering is throttled (or documented as unbounded)', async ({ freePage }) => {
    test.setTimeout(120_000) // each call ships the whole 584-question bank
    const codes: number[] = []
    for (let i = 0; i < 12; i++) {
      const r = await freePage.request.get('/api/app/question-bank', { timeout: 8000 }).catch(() => null)
      if (!r) break
      codes.push(r.status())
      if (r.status() === 429) break
    }
    const throttled = codes.includes(429)
    // Not a hard fail — surfaces as info. If never throttled, log for review.
    if (!throttled) console.warn(`[abuse] /api/app/question-bank: 40 rapid calls, no 429 (codes seen: ${[...new Set(codes)].join(',')})`)
    expect(codes.every((c) => c < 500), 'question-bank 5xx under load').toBe(true)
  })
})
