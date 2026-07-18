import { defineConfig, devices } from '@playwright/test'
import { config as dotenv } from 'dotenv'
import path from 'node:path'

// Load .env.local (Supabase URL/anon/service-role) so global-setup can mint
// sessions. Falls back silently if the file is absent (CI passes env directly).
dotenv({ path: path.resolve(__dirname, '.env.local') })

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'
const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1')

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e/.artifacts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Abuse/smoke suites: no retries so a flake reads as a flake, not a pass.
  retries: 0,
  workers: process.env.E2E_WORKERS ? Number(process.env.E2E_WORKERS) : 4,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/e2e/report', open: 'never' }],
    ['json', { outputFile: 'tests/e2e/report/results.json' }],
  ],
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    // "Record the errors": keep the full video + trace + screenshot ONLY when a
    // test fails, so every bug ships with a replay. `npx playwright show-trace`.
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 12_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
  // Auto-boot the app for local runs — one command starts everything.
  webServer: isLocal
    ? {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      }
    : undefined,
})
