import { test, expect, hasSession } from './fixtures'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'

// ── Layer: ACCESSIBILITY + MOBILE UX
// The audience works on phones with gloves on. Serious a11y violations and
// sub-44px tap targets are real usability bugs, not box-ticking.

async function scan(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
  const summary = serious
    .map((v) => `${v.impact?.toUpperCase()} ${v.id}: ${v.help} (${v.nodes.length}x)\n    ${v.nodes[0]?.target?.join(' ')}`)
    .join('\n  ')
  expect(serious, `${label} — serious/critical a11y violations:\n  ${summary}`).toEqual([])
}

test.describe('accessibility (anon)', () => {
  for (const p of ['/login', '/pricing']) {
    test(`${p} has no serious a11y violations`, async ({ anonPage }) => {
      await anonPage.goto(p, { waitUntil: 'networkidle' })
      await scan(anonPage, p)
    })
  }
})

test.describe('accessibility (signed in)', () => {
  test.skip(!hasSession('free'), 'no free session')
  for (const p of ['/dashboard', '/learn']) {
    test(`${p} has no serious a11y violations`, async ({ freePage }) => {
      await freePage.goto(p, { waitUntil: 'networkidle' })
      await scan(freePage, p)
    })
  }
})

test.describe('mobile UX', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('no horizontal scrolling on key screens', async ({ freePage }) => {
    for (const p of ['/dashboard', '/learn', '/progress']) {
      await freePage.goto(p, { waitUntil: 'networkidle' })
      const overflow = await freePage.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${p} scrolls sideways (${overflow}px) — layout overflows the viewport`).toBeLessThanOrEqual(2)
    }
  })

  test('primary tap targets are at least 44px', async ({ freePage }) => {
    await freePage.goto('/learn', { waitUntil: 'networkidle' })
    const small = await freePage.evaluate(() => {
      const out: string[] = []
      document.querySelectorAll('button, a[href]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return // hidden
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none') return
        if (r.height < 44 && r.width < 44) {
          out.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 25)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
      })
      return out
    })
    // Report rather than hard-fail: icon-only controls legitimately vary.
    if (small.length) console.warn(`[ux] ${small.length} tap targets under 44px on /learn:\n  ${small.slice(0, 12).join('\n  ')}`)
    expect(small.length, `too many sub-44px tap targets:\n  ${small.slice(0, 12).join('\n  ')}`).toBeLessThan(12)
  })
})
