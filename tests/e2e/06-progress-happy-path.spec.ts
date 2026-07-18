import { test, expect, hasSession } from './fixtures'

// ── The flow that MUST keep working after the grade-token hardening:
// a genuinely completed level has to persist mastery. If the token stops
// flowing, progress silently stops saving again (the original bug), so this
// walks the exact API path the client uses.

test.describe('progress happy path (free)', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('a real graded quiz DOES persist mastery', async ({ freePage }) => {
    test.setTimeout(90_000)
    const conceptPrefix = 'core-ozone'

    // 1) start a level exactly like the client does
    const startRes = await freePage.request.post('/api/public/study-path', {
      data: { conceptPrefix, count: 10 },
    })
    expect(startRes.status(), 'could not start a level').toBeLessThan(400)
    const start = await startRes.json()
    const quizId: string = start.quizId
    const questions: Array<{ id: string; options: string[] }> = start.questions ?? []
    expect(quizId, 'no quizId returned').toBeTruthy()
    expect(questions.length, 'no questions returned').toBeGreaterThan(0)

    // 2) grade it. We do not know the right answers client-side (by design),
    //    so we just answer and read the authoritative score back.
    const answers: Record<string, string> = {}
    for (const q of questions) answers[q.id] = q.options?.[0] ?? ''
    const scoreRes = await freePage.request.post('/api/public/score', { data: { quizId, answers } })
    expect(scoreRes.status(), 'grading failed').toBeLessThan(400)
    const graded = await scoreRes.json()

    // 3) the grade must be signed — this is what makes progress trustworthy
    expect(graded.gradeToken, 'score endpoint did not issue a gradeToken').toBeTruthy()
    expect(typeof graded.percentage, 'no percentage in grade').toBe('number')

    // 4) persist it the way the client does
    const saveRes = await freePage.request.post('/api/study-path/progress', {
      data: {
        conceptId: conceptPrefix,
        status: graded.percentage >= 80 ? 'mastered' : 'pending',
        passCount: graded.percentage >= 80 ? 1 : 0,
        lastPassed: new Date().toISOString(),
        lastScore: graded.percentage,
        gradeToken: graded.gradeToken,
      },
    })
    expect(saveRes.status(), 'saving progress failed').toBeLessThan(400)
    const saved = await saveRes.json()

    // 5) the SERVER must have credited the real score (not zero) — proving the
    //    token verified. A regression here means progress silently stops saving.
    expect(
      saved.best_score,
      `server did not credit the signed grade (got ${JSON.stringify(saved)}) — the gradeToken is not verifying, progress will silently stop persisting`,
    ).toBe(graded.percentage)

    // 6) and it must come back on read
    const readRes = await freePage.request.get('/api/app/study-progress')
    const read = await readRes.json()
    const row = (read.progress ?? []).find((p: { concept_id: string }) => p.concept_id === conceptPrefix)
    expect(row, 'saved progress did not come back from /api/app/study-progress').toBeTruthy()
    expect(row.best_score, 'persisted best_score does not match the graded score').toBe(graded.percentage)
  })
})
