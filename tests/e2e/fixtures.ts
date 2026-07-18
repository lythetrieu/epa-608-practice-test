import { test as base, type Page, type BrowserContext, type TestInfo, type Browser } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const AUTH_DIR = path.resolve(__dirname, '.auth')

function stateFor(key: string) {
  const p = path.join(AUTH_DIR, `${key}.json`)
  return fs.existsSync(p) ? p : undefined
}

/** True when a persona's storage state actually carries an auth cookie. */
export function hasSession(key: string): boolean {
  const p = stateFor(key)
  if (!p) return false
  try {
    const s = JSON.parse(fs.readFileSync(p, 'utf8')) as { cookies?: { name: string }[] }
    return !!s.cookies?.some((c) => c.name.includes('auth-token'))
  } catch {
    return false
  }
}

// Contexts we build by hand do NOT inherit `use.video` from the config, so we
// opt each one into recording and then keep the file ONLY when the test failed
// (mirroring `retain-on-failure`, but for custom contexts).
async function openPersona(browser: Browser, key: string, testInfo: TestInfo) {
  const ctx = await browser.newContext({
    storageState: stateFor(key),
    recordVideo: { dir: testInfo.outputPath('video'), size: { width: 1280, height: 720 } },
  })
  const page = await ctx.newPage()
  return { ctx, page }
}

// Every failure video also lands in ONE visible folder (tests/e2e/videos) with
// a readable name, so you don't have to dig through the hidden .artifacts tree.
export const VIDEO_DIR = path.resolve(__dirname, 'videos')

function safeName(s: string) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90)
}

async function closePersona(ctx: BrowserContext, page: Page, testInfo: TestInfo, label: string) {
  const video = page.video()
  await page.close().catch(() => {})
  await ctx.close().catch(() => {}) // finalizes the .webm
  if (!video) return
  const failed = testInfo.status !== testInfo.expectedStatus
  try {
    if (failed) {
      const src = await video.path()
      // 1) keep it attached to the HTML report
      await testInfo.attach(`video-${label}`, { path: src, contentType: 'video/webm' })
      // 2) ALSO drop a readable copy in the single shared folder
      fs.mkdirSync(VIDEO_DIR, { recursive: true })
      const project = testInfo.project.name
      const dest = path.join(VIDEO_DIR, `${safeName(testInfo.title)}__${project}__${label}.webm`)
      fs.copyFileSync(src, dest)
    } else {
      await video.delete()
    }
  } catch {
    /* video may already be gone */
  }
}

type Personas = {
  anonPage: Page
  freePage: Page
  proPage: Page
  starterPage: Page
}

function personaFixture(key: string) {
  return async (
    { browser }: { browser: Browser },
    use: (p: Page) => Promise<void>,
    testInfo: TestInfo,
  ) => {
    const { ctx, page } = await openPersona(browser, key, testInfo)
    await use(page)
    await closePersona(ctx, page, testInfo, key)
  }
}

export const test = base.extend<Personas>({
  anonPage: personaFixture('anon'),
  freePage: personaFixture('free'),
  proPage: personaFixture('pro'),
  starterPage: personaFixture('starter'),
})

export const expect = test.expect
