import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Feature gating: the free tier must NOT reach Pro-only surfaces (timed
// simulation, radar weak-spots) while Pro must. These are the "did the paywall
// hold" checks. Privilege-escalation via direct API is covered in 03-abuse-api.

async function startsTimedTest(page: Page): Promise<boolean> {
  // A live timed test shows a running countdown (mm:ss) AND the answered
  // counter. The gated path bounces free users to the mode selector / upgrade.
  //
  // The quiz mounts client-side, so the countdown and the answered-counter
  // appear a beat AFTER navigation settles. Reading the body once used to race
  // that render and report Pro as "over-gated" while the failure screenshot
  // showed a perfectly live 30:00 timer on CORE 1/25 — the app was fine, the
  // check was early. Poll until one of the two outcomes is actually on screen.
  await page.goto('/test/core?mode=test', { waitUntil: 'domcontentloaded' }).catch(() => {})

  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    // Gated: bounced to the paywall. Checked first so the free case still
    // resolves on the first pass instead of waiting out the deadline.
    if (/upgrade|pricing|checkout/i.test(page.url())) return false
    const body = await page.locator('body').innerText().catch(() => '')
    if (/upgrade to pro|go pro|pro only|unlock timed/i.test(body)) return false
    const hasTimer = /\b\d{1,2}:\d{2}\b/.test(body)
    const hasCounter = /\d+\s*\/\s*\d+\s*answered/i.test(body)
    if (hasTimer && hasCounter) return true
    await page.waitForTimeout(500)
  }
  return false
}

test.describe('timed-mode gate', () => {
  test.skip(!hasSession('free') || !hasSession('pro'), 'need free + pro sessions')

  test('free is BLOCKED from timed simulation', async ({ freePage }) => {
    const started = await startsTimedTest(freePage)
    expect(started, 'free tier managed to start a timed test — paywall leak').toBe(false)
  })

  test('pro CAN start timed simulation', async ({ proPage }) => {
    const started = await startsTimedTest(proPage)
    expect(started, 'pro tier could not start a timed test — over-gated').toBe(true)
  })
})

test.describe('weak-spots / radar surface', () => {
  test.skip(!hasSession('free') || !hasSession('pro'), 'need free + pro sessions')

  test('free weak-spots loads without a Pro-only crash', async ({ freePage }) => {
    const resp = await freePage.goto('/progress/weak-spots', { waitUntil: 'networkidle' }).catch(() => null)
    expect(resp?.status() ?? 0).toBeLessThan(500)
    const body = await freePage.locator('body').innerText().catch(() => '')
    expect(body).not.toMatch(/Application error|Something went wrong/i)
  })

  test('pro weak-spots loads', async ({ proPage }) => {
    const resp = await proPage.goto('/progress/weak-spots', { waitUntil: 'networkidle' }).catch(() => null)
    expect(resp?.status() ?? 0).toBeLessThan(500)
    const body = await proPage.locator('body').innerText().catch(() => '')
    expect(body).not.toMatch(/Application error|Something went wrong/i)
  })
})
