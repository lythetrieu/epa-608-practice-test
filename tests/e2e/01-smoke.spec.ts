import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Smoke: every persona walks the core routes; we flag 500s, Next error
// boundaries, and hard console/page errors. This is the "use it like a real
// user" sweep.

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /Microsoft Clarity/i,
  /\[GSI_LOGGER\]/i, // google identity noise
  /Failed to load resource.*(clarity|googletagmanager|google-analytics|doubleclick|adsbygoogle)/i,
  /net::ERR_.*(clarity|analytics|gtag)/i,
  // KNOWN FINDING (reported separately): CSP script-src/connect-src omit
  // clarity.ms, so GTM-injected Microsoft Clarity is blocked. Filtered here so
  // it doesn't mask OTHER console errors on every page.
  /Content Security Policy.*clarity\.ms/i,
  /clarity\.ms.*Content Security Policy/i,
]

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text()
      if (!IGNORE_CONSOLE.some((re) => re.test(t))) errors.push(`console: ${t}`)
    }
  })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    if (r.status() >= 500) errors.push(`http ${r.status()}: ${r.url()}`)
  })
  return errors
}

async function assertHealthy(page: Page, route: string, errors: string[]) {
  // Next.js error boundary text
  const body = await page.locator('body').innerText().catch(() => '')
  expect(body, `${route} shows an error boundary`).not.toMatch(/Application error|Internal Server Error|This page could not be found|Something went wrong/i)
  expect(errors, `${route} console/page/500 errors:\n${errors.join('\n')}`).toEqual([])
}

test.describe('anon smoke', () => {
  // NOTE: '/' is owned by the marketing site; the app 404s it locally and
  // 307s to /login in prod, so it isn't an app route to smoke here.
  const routes = ['/login', '/pricing']
  for (const route of routes) {
    test(`anon can load ${route}`, async ({ anonPage }) => {
      const errors = watchErrors(anonPage)
      const resp = await anonPage.goto(route, { waitUntil: 'networkidle' }).catch(() => null)
      expect(resp?.status() ?? 0, `${route} status`).toBeLessThan(500)
      await assertHealthy(anonPage, route, errors)
    })
  }

  test('anon /learn is gated (redirect to login)', async ({ anonPage }) => {
    await anonPage.goto('/learn')
    await expect(anonPage).toHaveURL(/\/login/, { timeout: 15_000 })
  })
})

const AUTHED_ROUTES = ['/dashboard', '/learn', '/flashcards', '/progress', '/history', '/settings', '/tutor', '/practice/core']

test.describe('free smoke', () => {
  test.skip(!hasSession('free'), 'no free session (add .env.local + service role)')
  for (const route of AUTHED_ROUTES) {
    test(`free walks ${route}`, async ({ freePage }) => {
      const errors = watchErrors(freePage)
      const resp = await freePage.goto(route, { waitUntil: 'networkidle' }).catch(() => null)
      expect(resp?.status() ?? 0, `${route} status`).toBeLessThan(500)
      await expect(freePage).not.toHaveURL(/\/login/, { timeout: 8000 })
      await assertHealthy(freePage, route, errors)
    })
  }
})

test.describe('pro smoke', () => {
  test.skip(!hasSession('pro'), 'no pro session')
  for (const route of AUTHED_ROUTES) {
    test(`pro walks ${route}`, async ({ proPage }) => {
      const errors = watchErrors(proPage)
      const resp = await proPage.goto(route, { waitUntil: 'networkidle' }).catch(() => null)
      expect(resp?.status() ?? 0, `${route} status`).toBeLessThan(500)
      await assertHealthy(proPage, route, errors)
    })
  }
})
