import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Feature gating: the free tier must NOT reach Pro-only surfaces (timed
// simulation, radar weak-spots) while Pro must. These are the "did the paywall
// hold" checks. Privilege-escalation via direct API is covered in 03-abuse-api.

async function startsTimedTest(page: Page): Promise<boolean> {
  // A live timed test shows a running countdown (mm:ss) AND the answered
  // counter. The gated path bounces free users to the mode selector / upgrade.
  await page.goto('/test/core?mode=test', { waitUntil: 'networkidle' }).catch(() => {})
  if (/upgrade|pricing|checkout/i.test(page.url())) return false
  const body = await page.locator('body').innerText().catch(() => '')
  const hasUpgrade = /upgrade to pro|go pro|pro only|unlock timed/i.test(body)
  const hasTimer = /\b\d{1,2}:\d{2}\b/.test(body)
  const hasCounter = /\d+\s*\/\s*\d+\s*answered/i.test(body)
  return hasTimer && hasCounter && !hasUpgrade
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
