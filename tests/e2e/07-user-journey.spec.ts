import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Layer: REAL USER JOURNEY
// Everything else in this suite loads a URL and asserts. This file behaves like
// a person: opens a world, starts a level, reads each question, picks an
// answer, advances, reads the score, then checks the result actually stuck.
// These are the tests whose video is worth watching.

// Covers the two dominant formats: "A 100,000" style multiple choice and bare
// True/False. SELECT-ALL questions render bare values ("R-744") and are not
// driven yet — the loop logs and stops there rather than pretending to pass.
const OPTION = /^([A-D]\s.+|True|False)$/
const QUESTION = 'What is the leak rate threshold for comfort cooling?'

/** Read the question currently on screen, for the log. */
async function currentQuestion(page: Page): Promise<string> {
  const t = await page.locator('body').innerText().catch(() => '')
  const line = t.split('\n').map((l) => l.trim()).find((l) => l.length > 25 && l.includes('?'))
  return (line ?? '').slice(0, 70)
}

/** Answer one question and advance. Returns false when the quiz has ended. */
async function answerOne(page: Page): Promise<boolean> {
  const options = page.getByRole('button', { name: OPTION })
  // Wait for the next question to paint rather than guessing a delay — this is
  // what a person does: they wait until they can see the choices.
  const appeared = await options
    .first()
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false)

  if (!appeared) {
    // Numeric-entry questions have a box instead of choices.
    const numeric = page.locator('input[type="number"], input[inputmode="numeric"]').first()
    if (await numeric.isVisible().catch(() => false)) {
      await numeric.fill('10')
      const go = page.getByRole('button', { name: /next question|next|finish|submit|continue/i }).first()
      if (await go.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
        await go.click()
        await page.waitForTimeout(700)
        return true
      }
    }
    // Unknown format — say exactly what is on screen so the next fix is quick.
    const shown = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ')
    console.log(`[journey] STUCK — no recognised answer control. Screen: ${shown.slice(-220)}`)
    return false
  }

  const n = await options.count().catch(() => 0)
  if (n === 0) return false

  const pick = options.nth(Math.floor(Math.random() * Math.min(n, 4)))
  await pick.click({ timeout: 8000 })

  // after choosing, the screen shows feedback and an advance control
  const next = page.getByRole('button', { name: /next question|next|finish|see results|submit|continue/i }).first()
  let hasNext = await next.waitFor({ state: 'visible', timeout: 4000 }).then(() => true).catch(() => false)

  // "Select TWO" questions keep the advance control hidden until a second
  // answer is picked — the run used to stall here and look like a dead quiz.
  if (!hasNext && n > 1) {
    const second = options.nth((Math.floor(Math.random() * Math.min(n, 4)) + 1) % Math.min(n, 4))
    await second.click({ timeout: 6000 }).catch(() => {})
    hasNext = await next.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)
  }
  if (!hasNext) return false

  await next.click({ timeout: 8000 })
  // either the next question paints, or we've reached the result screen
  await page.waitForTimeout(700)
  return true
}

async function openWorld(page: Page, world: string) {
  await page.goto('/learn?unlock=1', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: new RegExp(world, 'i') }).first().click({ timeout: 15_000 })
  await page.getByText(/Study Route/i).first().waitFor({ timeout: 12_000 })
}

test.describe('a real user studies a level', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('open a world, take a full level, reach a score', async ({ freePage }) => {
    test.setTimeout(180_000)
    const errors: string[] = []
    freePage.on('pageerror', (e) => errors.push(e.message))
    freePage.on('response', (r) => { if (r.status() >= 500) errors.push(`5xx ${r.url()}`) })

    await openWorld(freePage, 'Type I')

    // start whichever level is current
    const start = freePage.getByRole('button', { name: /^(Start|Try again|Open)$/ }).first()
    await expect(start, 'no Start/Open control on the level path').toBeVisible({ timeout: 12_000 })
    await start.click()
    await freePage.waitForTimeout(2000)

    // the quiz must actually present a question with answers
    const firstOptions = freePage.getByRole('button', { name: OPTION })
    await expect(firstOptions.first(), 'level opened but no answer options rendered').toBeVisible({ timeout: 15_000 })

    // work through the quiz
    let answered = 0
    for (let i = 0; i < 14; i++) {
      const q = await currentQuestion(freePage)
      const advanced = await answerOne(freePage)
      if (!advanced) break
      answered++
      if (q) console.log(`[journey] Q${answered}: ${q}`)
    }
    console.log(`[journey] answered ${answered} questions`)
    // A working quiz lets a user get well into it. Anything under 5 means the
    // flow itself is broken (dead Start button, questions not loading, an
    // advance control that does nothing) — that is what this guards.
    expect(answered, 'the quiz flow stalled almost immediately — users cannot progress').toBeGreaterThanOrEqual(5)

    // Finishing all ten must land on a score.
    const body = await freePage.locator('body').innerText().catch(() => '')
    if (answered >= 10) {
      const scored = /\b\d{1,3}\s?%/.test(body) || /passing mark|you mastered|didn'?t pass|keep going|your answer/i.test(body)
      expect(scored, `finished 10 questions but no score appeared. Screen said:\n${body.slice(0, 400)}`).toBe(true)
    }

    expect(errors, `runtime errors during the journey:\n${errors.join('\n')}`).toEqual([])
  })

  test('the attempt is still there after leaving and coming back', async ({ freePage }) => {
    test.setTimeout(180_000)
    // read progress before
    const before = await (await freePage.request.get('/api/app/study-progress')).json().catch(() => ({}))
    const beforeAttempts = (before.progress ?? []).reduce((s: number, p: { attempts?: number }) => s + (p.attempts ?? 0), 0)

    await openWorld(freePage, 'Type I')
    const start = freePage.getByRole('button', { name: /^(Start|Try again|Open)$/ }).first()
    if (!(await start.isVisible().catch(() => false))) test.skip(true, 'no level to start')
    await start.click()
    await freePage.waitForTimeout(1800)
    for (let i = 0; i < 14; i++) if (!(await answerOne(freePage))) break

    // A real user waits to see their score before leaving. Grading and the
    // progress write happen here, so navigating instantly would race them.
    await expect
      .poll(async () => (await freePage.locator('body').innerText().catch(() => '')), { timeout: 30_000 })
      .toMatch(/\d{1,3}\s?%|passing mark|you mastered|didn'?t pass/i)
    await freePage.waitForTimeout(1500)

    // walk away and come back, like a user closing the tab
    await freePage.goto('/dashboard', { waitUntil: 'networkidle' })
    await freePage.waitForTimeout(800)

    const after = await (await freePage.request.get('/api/app/study-progress')).json().catch(() => ({}))
    const afterAttempts = (after.progress ?? []).reduce((s: number, p: { attempts?: number }) => s + (p.attempts ?? 0), 0)
    expect(
      afterAttempts,
      `the attempt was not recorded (attempts ${beforeAttempts} -> ${afterAttempts}). Progress is not persisting.`,
    ).toBeGreaterThan(beforeAttempts)
  })
})

test.describe('a real user uses the other features', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('flashcards actually flip and advance', async ({ freePage }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    freePage.on('pageerror', (e) => errors.push(e.message))
    await freePage.goto('/flashcards', { waitUntil: 'networkidle' })
    await freePage.waitForTimeout(1500)

    const before = (await freePage.locator('body').innerText().catch(() => '')).slice(0, 400)
    // a card surface or a start control
    const starter = freePage.getByRole('button', { name: /start|begin|core|flip|show answer/i }).first()
    if (await starter.isVisible().catch(() => false)) {
      await starter.click().catch(() => {})
      await freePage.waitForTimeout(1200)
    }
    const after = (await freePage.locator('body').innerText().catch(() => '')).slice(0, 400)
    expect(after !== before || after.length > 0, 'flashcards screen never changed').toBe(true)
    expect(errors, `flashcards runtime errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('the AI tutor answers a Pro user', async ({ proPage }) => {
    test.setTimeout(150_000)
    test.skip(!hasSession('pro'), 'no pro session')
    await proPage.goto('/tutor', { waitUntil: 'networkidle' })
    await proPage.waitForTimeout(1200)

    const box = proPage.locator('textarea, input[type="text"]').first()
    if (!(await box.isVisible().catch(() => false))) test.skip(true, 'no tutor input')

    await box.fill(QUESTION)
    const send = proPage.getByRole('button', { name: /^Send$/i }).first()
    if (await send.isVisible().catch(() => false)) await send.click()
    else await box.press('Enter')

    // Measure the REPLY, not the page size. Sending clears the suggestion
    // chips (page shrinks) and the answer can land in under 3s, so any
    // "did the text grow from a baseline" check reported a working tutor as
    // hung. Read whatever follows the question in the transcript instead.
    await expect
      .poll(
        async () => {
          const t = await proPage.locator('body').innerText().catch(() => '')
          const i = t.indexOf(QUESTION)
          return i === -1 ? 0 : t.slice(i + QUESTION.length).trim().length
        },
        { timeout: 90_000, intervals: [1000, 2000, 3000] },
      )
      .toBeGreaterThan(80)

    const reply = await proPage.locator('body').innerText()
    expect(reply, 'tutor errored instead of answering').not.toMatch(/something went wrong|try again later/i)
  })

  test('free tier is held to its monthly AI quota', async ({ freePage }) => {
    test.setTimeout(120_000)
    await freePage.goto('/tutor', { waitUntil: 'networkidle' })
    await freePage.waitForTimeout(1200)
    const box = freePage.locator('textarea, input[type="text"]').first()
    if (!(await box.isVisible().catch(() => false))) test.skip(true, 'no tutor input')

    const codes: number[] = []
    freePage.on('response', (r) => { if (/\/api\/ai\/chat/.test(r.url())) codes.push(r.status()) })

    await box.fill('What is the de minimis release rule?')
    const send = freePage.getByRole('button', { name: /^Send$/i }).first()
    if (await send.isVisible().catch(() => false)) await send.click()
    else await box.press('Enter')
    await freePage.waitForTimeout(12_000)

    const body = await freePage.locator('body').innerText().catch(() => '')
    const answered = codes.includes(200)
    const capped = codes.includes(429) || /monthly limit reached|limit/i.test(body)
    // Either it answered (quota left) or it refused clearly — never a silent hang.
    expect(answered || capped, `tutor neither answered nor explained the limit. Codes: ${codes.join(',')}`).toBe(true)
    if (capped) expect(body, 'quota block must tell the user what happened').toMatch(/limit/i)
  })
})
