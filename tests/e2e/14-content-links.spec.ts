import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Layer: CONTENT + LINK ROT
// Catches the embarrassing stuff a user sees first: a dead nav link, a raw
// "undefined" where a name should be, a price that renders as NaN.

const PLACEHOLDER = /\bundefined\b|\bNaN\b|\[object Object\]|lorem ipsum|\bTODO\b|\bFIXME\b|\bnull\b%/i

async function visibleText(page: Page) {
  return (await page.locator('body').innerText().catch(() => '')) || ''
}

test.describe('rendered text is clean', () => {
  const anonPages = ['/login', '/pricing']
  for (const p of anonPages) {
    test(`${p} shows no placeholder / broken interpolation`, async ({ anonPage }) => {
      await anonPage.goto(p, { waitUntil: 'networkidle' })
      const text = await visibleText(anonPage)
      const hits = text.split('\n').filter((l) => PLACEHOLDER.test(l)).map((l) => l.trim().slice(0, 100))
      expect(hits, `${p} renders placeholder/broken text:\n${hits.join('\n')}`).toEqual([])
    })
  }

  test.describe('signed in', () => {
    test.skip(!hasSession('free'), 'no free session')
    for (const p of ['/dashboard', '/learn', '/progress', '/settings']) {
      test(`${p} shows no placeholder / broken interpolation`, async ({ freePage }) => {
        await freePage.goto(p, { waitUntil: 'networkidle' })
        const text = await visibleText(freePage)
        const hits = text.split('\n').filter((l) => PLACEHOLDER.test(l)).map((l) => l.trim().slice(0, 100))
        expect(hits, `${p} renders placeholder/broken text:\n${hits.join('\n')}`).toEqual([])
      })
    }
  })
})

test.describe('internal links resolve', () => {
  test.skip(!hasSession('free'), 'no free session')

  test('no dead internal links on the main app screens', async ({ freePage }) => {
    test.setTimeout(120_000)
    const checked = new Map<string, number>()
    const dead: string[] = []

    for (const page of ['/dashboard', '/learn', '/progress', '/settings']) {
      await freePage.goto(page, { waitUntil: 'networkidle' })
      const hrefs = await freePage.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => (a as HTMLAnchorElement).getAttribute('href') || '')
          .filter((h) => h.startsWith('/') && !h.startsWith('//')),
      )
      for (const href of new Set(hrefs)) {
        if (checked.has(href)) continue
        const res = await freePage.request.get(href, { maxRedirects: 5 }).catch(() => null)
        const code = res?.status() ?? 0
        checked.set(href, code)
        if (code >= 400) dead.push(`${code}  ${href}   (linked from ${page})`)
      }
    }
    console.log(`[links] checked ${checked.size} internal links`)
    expect(dead, `dead internal links:\n${dead.join('\n')}`).toEqual([])
  })
})
