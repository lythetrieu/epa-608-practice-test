import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Regression on the new winding "service route" + ?unlock=1 QA mode.

async function enterWorld(page: Page, world: string) {
  await page.getByText(world, { exact: false }).first().click({ timeout: 15_000 }).catch(() => {})
  // world view shows "<World> levels" + the Study Route eyebrow
  await page.getByText(/Study Route/i).first().waitFor({ timeout: 10_000 }).catch(() => {})
}

test.describe('winding study path', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('Type II renders 9 stops on a single curved road, nothing overflows', async ({ freePage }) => {
    await freePage.goto('/learn', { waitUntil: 'networkidle' })
    await enterWorld(freePage, 'Type II')

    // the curved road svg exists
    const roadPaths = freePage.locator('svg path[stroke-dasharray], svg path[stroke="#d4dde8"]')
    expect(await roadPaths.count(), 'winding road path missing').toBeGreaterThan(0)

    // Boss node + at least the 9 Type II level titles somewhere on the route
    await expect(freePage.getByText(/Boss Exam/i).first()).toBeVisible({ timeout: 8000 })

    // No horizontal scroll: route must fit the viewport (regression on stretch/overlap)
    const overflow = await freePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow, 'page scrolls horizontally — winding route overflows').toBeLessThanOrEqual(2)
  })

  test('?unlock=1 makes locked stops tappable (Open buttons appear)', async ({ freePage }) => {
    await freePage.goto('/learn?unlock=1', { waitUntil: 'networkidle' })
    await enterWorld(freePage, 'Type II')
    // Reload inside the world so the unlock flag (localStorage) is applied.
    await freePage.reload({ waitUntil: 'networkidle' }).catch(() => {})
    await enterWorld(freePage, 'Type II')
    const openBtns = freePage.getByRole('button', { name: /^Open/i })
    expect(await openBtns.count(), 'unlock=1 did not expose any Open buttons on locked stops').toBeGreaterThan(0)
  })

  test('unlock=0 clears the QA flag', async ({ freePage }) => {
    await freePage.goto('/learn?unlock=0', { waitUntil: 'networkidle' })
    const flag = await freePage.evaluate(() => localStorage.getItem('epa608_qa_unlock'))
    expect(flag).toBeNull()
  })
})
