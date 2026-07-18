import { test, expect } from './fixtures'

// ── Layer: SECURITY POSTURE
// Header regressions are silent and easy to make (one CSP edit dropped Clarity
// for months). These lock the baseline in.

const PAGES = ['/login', '/pricing']

test.describe('security headers', () => {
  for (const p of PAGES) {
    test(`${p} ships the baseline headers`, async ({ anonPage }) => {
      const res = await anonPage.request.get(p)
      const h = res.headers()

      const csp = h['content-security-policy'] ?? ''
      expect(csp, `${p} has no Content-Security-Policy`).not.toBe('')
      expect(csp, 'CSP must not allow object/embed').toMatch(/object-src\s+'none'|default-src/)
      expect(csp, "CSP must not use script-src '*'").not.toMatch(/script-src[^;]*\*/)

      expect(h['x-content-type-options'], `${p} missing X-Content-Type-Options`).toBe('nosniff')
      expect(h['referrer-policy'] ?? '', `${p} missing Referrer-Policy`).not.toBe('')
      // clickjacking: either header or CSP frame-ancestors
      const framed = (h['x-frame-options'] ?? '') !== '' || /frame-ancestors/.test(csp)
      expect(framed, `${p} has no clickjacking protection`).toBe(true)
    })
  }

  test('HTTPS responses carry HSTS', async ({ anonPage }) => {
    const res = await anonPage.request.get('/login')
    if (!res.url().startsWith('https://')) { test.skip(true, 'local http run'); return }
    const hsts = res.headers()['strict-transport-security'] ?? ''
    expect(hsts, 'missing Strict-Transport-Security').not.toBe('')
    expect(hsts).toMatch(/max-age=\d{6,}/)
  })
})

test.describe('secret hygiene', () => {
  test('no service-role key or private secret is shipped to the browser', async ({ anonPage }) => {
    const leaks: string[] = []
    anonPage.on('response', async (r) => {
      const ct = r.headers()['content-type'] ?? ''
      if (!/javascript|html/.test(ct)) return
      const body = await r.text().catch(() => '')
      // service_role JWTs carry this claim; sb_secret_ is the new-style secret
      if (/"role"\s*:\s*"service_role"/.test(body) || /\bsb_secret_[A-Za-z0-9_-]{10,}/.test(body)) {
        leaks.push(r.url())
      }
      if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{20,}/.test(body)) leaks.push(`${r.url()} (env name + value)`)
    })
    await anonPage.goto('/login', { waitUntil: 'networkidle' })
    expect(leaks, `SERVER SECRET SHIPPED TO BROWSER:\n${leaks.join('\n')}`).toEqual([])
  })

  test('session cookies carry Secure + SameSite', async ({ freePage }) => {
    await freePage.goto('/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {})
    const cookies = await freePage.context().cookies()
    const auth = cookies.filter((c) => c.name.includes('auth-token'))
    if (!auth.length) { test.skip(true, 'no session cookie in this run'); return }
    const isHttps = freePage.url().startsWith('https://')

    for (const c of auth) {
      if (isHttps) expect(c.secure, `cookie ${c.name} is not Secure`).toBe(true)
      expect(c.sameSite, `cookie ${c.name} has no SameSite protection`).not.toBe('None')

      // KNOWN ACCEPTED RISK — not a failure:
      // @supabase/ssr's createBrowserClient reads and writes the session cookie
      // from JavaScript, so it cannot be HttpOnly without moving to a
      // server-only auth architecture. The mitigation is the CSP + keeping XSS
      // out. Logged so a future architecture change can flip it to a hard
      // assertion.
      if (!c.httpOnly) {
        console.warn(
          `[security] ${c.name} is JS-readable (HttpOnly=false). Inherent to the ` +
            `@supabase/ssr browser client; an XSS would expose the session. ` +
            `Mitigation = CSP. Revisit if auth moves server-only.`,
        )
      }
    }
  })
})
