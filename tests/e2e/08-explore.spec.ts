import { test, expect, hasSession } from './fixtures'
import type { Page } from '@playwright/test'

// ── Exploratory ("monkey") sweep.
//
// The other specs answer closed questions: does THIS button do THIS thing.
// Re-running them finds nothing new, because the answer never changes.
//
// This one is the opposite: it wanders. Each run picks a different path through
// the app — driven by EXPLORE_SEED, which CI derives from the run number — and
// after every single click it checks a handful of invariants that must hold no
// matter where you are. Nobody wrote down which sequence to try, so this is the
// spec that can surface a bug nobody thought to test for.
//
// It deliberately does NOT touch the AI tutor: those calls bill against the
// account's real monthly quota, and a wanderer that clicks it repeatedly would
// both burn the allowance and corrupt the quota test in 07.

const STEPS = Number(process.env.EXPLORE_STEPS || 25)
const SEED = Number(process.env.EXPLORE_SEED || 1)

// A seeded PRNG so a failing run can be replayed exactly: the report prints the
// seed, and EXPLORE_SEED=<n> reproduces the same walk. Math.random() would make
// every failure a one-off ghost.
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

// Anything that ends the session, spends money, or bills an AI call. A wanderer
// that hits these teaches us nothing and costs something.
const OFF_LIMITS =
  /sign out|log out|delete|remove|cancel subscription|upgrade|checkout|pay|buy|subscribe|ask ai|tutor|send|billing portal/i

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /Microsoft Clarity/i,
  /\[GSI_LOGGER\]/i,
  /Failed to load resource.*(clarity|googletagmanager|google-analytics|doubleclick|adsbygoogle)/i,
  /net::ERR_.*(clarity|analytics|gtag)/i,
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
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`)
  })
  return errors
}

/** Things that must be true on every screen, whatever route we wandered onto. */
async function screenIsSane(page: Page, where: string) {
  const body = await page.locator('body').innerText().catch(() => '')

  // A Next error boundary or a framework stack trace reaching the user.
  expect(body, `${where}: error boundary rendered`).not.toMatch(
    /Application error: a (client|server)-side exception|Unhandled Runtime Error|This page could not be found/i,
  )
  // A raw server error dumped into the page.
  expect(body, `${where}: server error text on screen`).not.toMatch(
    /Internal Server Error|500 -|TypeError:|ReferenceError:|undefined is not a function/i,
  )
  // A blank screen — the app rendered nothing a person could act on.
  expect(body.trim().length, `${where}: page is effectively blank`).toBeGreaterThan(40)
  // Untranslated template holes are a real bug users see.
  expect(body, `${where}: unrendered template placeholder`).not.toMatch(/\{\{[\w.]+\}\}|undefined undefined|NaN%/)
}

test.describe('a user who wanders', () => {
  test.skip(!hasSession('free'), 'needs the free persona session')

  test('clicking around the app never lands on a broken screen', async ({ freePage }) => {
    // The walk's length is a knob, so its deadline has to scale with it —
    // otherwise raising EXPLORE_STEPS just converts real coverage into timeouts.
    // Worst case per step ≈ scroll(2.5) + click(4) + load(10) + checks; budget
    // generously so a slow-but-healthy walk never reports a false timeout.
    test.setTimeout(STEPS * 12_000 + 30_000)
    const rand = rng(SEED)
    const errors = watchErrors(freePage)
    const visited: string[] = []

    await freePage.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await screenIsSane(freePage, 'start')

    for (let step = 0; step < STEPS; step++) {
      // Everything a person could plausibly click on this screen.
      const clickable = freePage.locator('a[href^="/"]:visible, button:visible')
      const total = await clickable.count().catch(() => 0)
      if (!total) break

      // Read every label in ONE round-trip. Asking element-by-element cost ~60
      // trips per step, which ate the whole time budget before the walk could
      // finish — the spec was timing out on its own bookkeeping, not on the app.
      const labels = (await clickable.allInnerTexts().catch(() => [])).map((t) => t.trim())

      // Drop anything destructive or billable.
      const safe: number[] = []
      for (let i = 0; i < labels.length; i++) {
        if (!labels[i] || OFF_LIMITS.test(labels[i])) continue
        safe.push(i)
      }
      if (!safe.length) break

      const pick = safe[Math.floor(rand() * safe.length)]
      // Labels can be multi-line ("608\nEPA 608\nPractice Test"); flatten so the
      // trail stays one line per step and remains readable.
      const label = labels[pick].replace(/\s+/g, ' ').slice(0, 40)

      // Short timeouts on purpose: a pick sitting behind a modal will never
      // become clickable, so failing fast and moving on keeps the walk within
      // budget instead of burning 13s hanging on one dead element.
      await clickable.nth(pick).scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {})
      await clickable.nth(pick).click({ timeout: 4000 }).catch(() => {})
      await freePage.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {})
      await freePage.waitForTimeout(500).catch(() => {})

      // A click can tear the page down (external target, hard navigation). That
      // is the end of the walk, not a product bug — stop and report the trail.
      if (freePage.isClosed()) {
        console.log(`[explore] page closed after "${label}" — ending walk at step ${step + 1}`)
        break
      }

      const url = new URL(freePage.url()).pathname
      // Printed as we go: when a step throws, the trail up to it is what tells
      // you which sequence to replay.
      console.log(`[explore] ${step + 1}. "${label || '(icon)'}" → ${url}`)
      visited.push(`${label || '(icon)'} → ${url}`)
      await screenIsSane(freePage, `after clicking "${label}" (step ${step + 1}, now at ${url})`)

      // Wandered off the product entirely (an external link slipped through) —
      // walk back rather than exploring someone else's site.
      if (!freePage.url().includes('epa608practicetest')) {
        await freePage.goBack().catch(() => {})
      }
    }

    console.log(`[explore] seed=${SEED} walked ${visited.length} screens cleanly`)
    expect(errors, `seed=${SEED} — replay with EXPLORE_SEED=${SEED}`).toEqual([])
  })
})
