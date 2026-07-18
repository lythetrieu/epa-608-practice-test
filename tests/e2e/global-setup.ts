import { chromium, type FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// Global setup — provision throwaway test users and mint browser sessions
// WITHOUT any password. We use the service-role admin API to (1) create the
// user with a confirmed email, (2) set its tier in users_profile, then (3)
// generate a magic-link token and drive the app's own /auth/confirm flow so the
// cookies land in the exact @supabase/ssr format. Session state is saved to
// tests/e2e/.auth/<persona>.json and loaded by fixtures.
//
// Nothing here types a password into a login form; users are provisioned via
// the admin API in the project's OWN Supabase, purely for automated testing.
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH_DIR = path.resolve(__dirname, '.auth')

export const PERSONAS = [
  { key: 'free', email: 'e2e-free@epa608-test.local', tier: 'free' },
  { key: 'pro', email: 'e2e-pro@epa608-test.local', tier: 'pro' },
  { key: 'starter', email: 'e2e-starter@epa608-test.local', tier: 'starter' },
] as const

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

// Structural type — avoids coupling to the generated Database generics.
type AdminAuth = {
  auth: { admin: { listUsers: (o: { page: number; perPage: number }) => Promise<{ data: { users: Array<{ id: string; email?: string }> }; error: unknown }> } }
}

async function findUserByEmail(admin: AdminAuth, email: string) {
  // listUsers is paged; scan a few pages for the test email.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email === email)
    if (hit) return hit
    if (data.users.length < 200) break
  }
  return null
}

export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  if (!URL || !SERVICE) {
    console.warn(
      '\n[e2e] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.\n' +
        '[e2e] Add them to .env.local. Writing EMPTY sessions — authed specs will be skipped.\n',
    )
    for (const p of PERSONAS) fs.writeFileSync(path.join(AUTH_DIR, `${p.key}.json`), JSON.stringify({ cookies: [], origins: [] }))
    fs.writeFileSync(path.join(AUTH_DIR, 'anon.json'), JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
  const password = `E2e!${Math.abs(hashStr(SERVICE)).toString(36)}Aa9` // deterministic, project-scoped, never typed into a form

  // anon persona = no session at all
  fs.writeFileSync(path.join(AUTH_DIR, 'anon.json'), JSON.stringify({ cookies: [], origins: [] }))

  const browser = await chromium.launch()
  try {
    for (const persona of PERSONAS) {
      // 1) upsert auth user (confirmed email)
      let user = await findUserByEmail(admin, persona.email)
      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: persona.email,
          password,
          email_confirm: true,
        })
        if (error) throw new Error(`createUser ${persona.email}: ${error.message}`)
        user = data.user
      }

      // 2) set tier on users_profile (row may be auto-created by a trigger; upsert to be safe)
      const { error: pErr } = await admin
        .from('users_profile')
        .upsert({ id: user!.id, email: persona.email, tier: persona.tier }, { onConflict: 'id' })
      if (pErr) console.warn(`[e2e] users_profile upsert (${persona.key}): ${pErr.message}`)

      // 3) magic-link → drive /auth/confirm to set cookies in the app's format
      const { data: link, error: lErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: persona.email,
      })
      if (lErr) throw new Error(`generateLink ${persona.email}: ${lErr.message}`)
      const tokenHash = (link.properties as { hashed_token?: string })?.hashed_token
      if (!tokenHash) throw new Error(`no hashed_token for ${persona.email}`)

      const ctx = await browser.newContext({ baseURL })
      const page = await ctx.newPage()
      await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=magiclink&next=/dashboard`)
      // ConfirmClient verifies client-side then redirects to /welcome?next → dashboard.
      await page
        .waitForURL((u) => !u.pathname.startsWith('/auth/confirm'), { timeout: 25_000 })
        .catch(() => {})
      // Confirm a session cookie exists before trusting the state.
      const cookies = await ctx.cookies()
      const hasSession = cookies.some((c) => c.name.includes('auth-token'))
      if (!hasSession) console.warn(`[e2e] WARNING: no auth cookie minted for ${persona.key} — authed specs may skip.`)
      await ctx.storageState({ path: path.join(AUTH_DIR, `${persona.key}.json`) })
      await ctx.close()
      console.log(`[e2e] session ready: ${persona.key} (${persona.tier})${hasSession ? '' : ' [NO COOKIE]'}`)
    }
  } finally {
    await browser.close()
  }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
