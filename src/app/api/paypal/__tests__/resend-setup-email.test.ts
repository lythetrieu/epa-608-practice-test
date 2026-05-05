import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockGenerateLink = vi.fn()
const mockFrom = vi.fn()

const supabaseMock = {
  from: mockFrom,
  auth: { admin: { generateLink: mockGenerateLink } },
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => supabaseMock,
}))

// ── Rate limiter mock ──────────────────────────────────────────────────────────
const mockRateLimitFn = vi.fn().mockResolvedValue({ success: true, reset: 0 })

vi.mock('@/lib/ratelimit', () => ({
  resendEmailRateLimit: { limit: mockRateLimitFn },
  getIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 })
  ),
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
function req(body: unknown, method = 'POST') {
  // Use a plain object and cast — Next.js RequestInit is compatible at runtime
  const headers: Record<string, string> = body !== undefined
    ? { 'Content-Type': 'application/json' }
    : {}
  const bodyStr = body !== undefined ? JSON.stringify(body) : undefined
  return new NextRequest('https://test.com/api/resend-setup-email', {
    method,
    ...(bodyStr !== undefined && { body: bodyStr }),
    ...(Object.keys(headers).length > 0 && { headers }),
  })
}

function reqRaw(rawBody: string) {
  return new NextRequest('https://test.com/api/resend-setup-email', {
    method: 'POST',
    body: rawBody,
    headers: { 'Content-Type': 'application/json' },
  })
}

type FetchResp = { json: object; ok?: boolean }

function mockFetch(...responses: FetchResp[]) {
  let i = 0
  vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]
    return { ok: r.ok ?? true, json: async () => r.json } as Response
  })
}

const RESEND_OK = { json: { id: 'resend-abc' } }

const RECOVERY_LINK = 'https://epa608practicetest.net/reset-password?token=xyz123'

/**
 * Configures Supabase mock for resend-setup-email scenarios.
 *
 * users_profile lookup returns `existingProfile` if provided, null otherwise.
 * app_config returns the resend key if `resendKey` is non-null.
 */
function setupDb({
  existingProfile = { id: 'user-uid' } as { id: string } | null,
  resendKey = 'resend-key-abc' as string | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    const chain = (resolve: unknown) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: resolve, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: resolve, error: null }),
    })

    if (table === 'users_profile') return chain(existingProfile)
    if (table === 'app_config') return chain(resendKey ? { value: resendKey } : null)
    return chain(null)
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('POST /api/resend-setup-email', () => {
  let POST: (req: NextRequest) => Promise<Response>
  let OPTIONS: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    // Re-apply mocks after resetModules so the freshly imported module picks them up
    vi.mock('@/lib/supabase/server', () => ({
      createAdminClient: () => supabaseMock,
    }))
    vi.mock('@/lib/ratelimit', () => ({
      resendEmailRateLimit: { limit: mockRateLimitFn },
      getIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
      rateLimitResponse: vi.fn().mockReturnValue(
        new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 })
      ),
    }))
    ;({ POST, OPTIONS } = await import('../../resend-setup-email/route'))
    mockRateLimitFn.mockResolvedValue({ success: true, reset: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // ── Input validation ─────────────────────────────────────────────────────────

  it('400 — missing email field in body', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/email/i) })
  })

  it('400 — empty string email', async () => {
    const res = await POST(req({ email: '' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/email/i) })
  })

  it('400 — invalid JSON body', async () => {
    const res = await POST(reqRaw('not-valid-json{{{'))
    expect(res.status).toBe(400)
  })

  it('400 — null email value', async () => {
    const res = await POST(req({ email: null }))
    expect(res.status).toBe(400)
  })

  it('400 — email is a number (wrong type)', async () => {
    const res = await POST(req({ email: 12345 }))
    expect(res.status).toBe(400)
  })

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it('429 — rate limited (limiter returns success: false)', async () => {
    mockRateLimitFn.mockResolvedValue({ success: false, reset: Date.now() + 3600_000 })
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(429)
  })

  // ── User not found ───────────────────────────────────────────────────────────

  it('404 — user not found in users_profile', async () => {
    setupDb({ existingProfile: null })
    const res = await POST(req({ email: 'nobody@example.com' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'No account found for this email' })
  })

  it('404 — user exists in auth but not in users_profile (no profile row)', async () => {
    // users_profile.single() returns null — profile not yet created
    setupDb({ existingProfile: null })
    const res = await POST(req({ email: 'auth-only@example.com' }))
    expect(res.status).toBe(404)
  })

  // ── Success: generateLink returns a valid link ───────────────────────────────

  it('200 — success: user found, link generated, email sent', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('200 — Resend is called with the correct recipient email address', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'recipient@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCall).toBeDefined()
    const body = JSON.parse(resendCall![1]!.body as string)
    expect(body.to).toContain('recipient@example.com')
  })

  it('200 — Resend email HTML contains the recovery/setup link', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.html).toContain('reset-password?token=xyz123')
  })

  it("200 — Resend 'from' address is support@epa608practicetest.net", async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.from).toContain('support@epa608practicetest.net')
  })

  it('200 — Resend email has a non-empty subject line', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(typeof body.subject).toBe('string')
    expect(body.subject.length).toBeGreaterThan(0)
  })

  // ── generateLink returns null → fallback URL ─────────────────────────────────

  it('200 — generateLink returns null data → fallback /forgot-password URL in email', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({ data: null })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(200)

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.html).toContain('forgot-password')
  })

  it('200 — generateLink returns empty action_link → fallback /forgot-password URL', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: null } },
    })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(200)

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.html).toContain('forgot-password')
  })

  // ── Missing resend key → 500 ─────────────────────────────────────────────────
  // Design decision: unlike the capture route (where email is a nice-to-have),
  // the entire purpose of this endpoint IS to send an email. Therefore a missing
  // resend key or a Resend API failure is fatal and returns 500.

  it('500 — resend_api_key not in app_config → returns 500 (email is the purpose)', async () => {
    setupDb({ resendKey: null })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as Response)

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
    // Resend should NOT have been called — we errored before reaching it
    const resendCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCall).toBeUndefined()
  })

  // ── Resend API failure → 500 ─────────────────────────────────────────────────
  // Design decision: if Resend throws a network error, the email was not sent.
  // Since sending the email IS the feature, we surface a 500 rather than
  // swallowing the error (contrast with capture route where email is non-fatal).

  it('500 — Resend API returns non-ok response → returns 500', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch({ json: { error: 'invalid_api_key' }, ok: false })

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  it('500 — Resend API throws network error → returns 500', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  // ── Supabase unexpected error ────────────────────────────────────────────────

  it('500 — Supabase admin client throws unexpected error', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('Unexpected Supabase internal error')
    })

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  // ── Email normalization ──────────────────────────────────────────────────────

  it('200 — uppercase email is normalized to lowercase before lookup', async () => {
    // The DB mock will only match the lowercase version used during lookup
    let capturedEmail: string | null = null
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_col: string, val: string) => {
        if (table === 'users_profile') capturedEmail = val
        const innerData = table === 'app_config' ? { value: 'resend-key' } : { id: 'uid' }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: innerData, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: innerData, error: null }),
        }
      }),
      single: vi.fn().mockResolvedValue({ data: { value: 'resend-key' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'uid' }, error: null }),
    }))
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'USER@EXAMPLE.COM' }))
    expect(res.status).toBe(200)
    expect(capturedEmail).toBe('user@example.com')
  })

  it('200 — email with leading/trailing whitespace is trimmed before lookup', async () => {
    let capturedEmail: string | null = null
    mockFrom.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((_col: string, val: string) => {
        if (table === 'users_profile') capturedEmail = val
        const innerData = table === 'app_config' ? { value: 'resend-key' } : { id: 'uid' }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: innerData, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: innerData, error: null }),
        }
      }),
      single: vi.fn().mockResolvedValue({ data: { value: 'resend-key' }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'uid' }, error: null }),
    }))
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: '  user@example.com  ' }))
    expect(res.status).toBe(200)
    expect(capturedEmail).toBe('user@example.com')
  })

  // ── No side effects on users_profile ────────────────────────────────────────

  it('200 — success does not call update or upsert on users_profile', async () => {
    const mockUpdate = vi.fn()
    const mockUpsert = vi.fn()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_profile') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'uid' }, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'uid' }, error: null }),
          update: mockUpdate,
          upsert: mockUpsert,
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { value: 'resend-key' }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  // ── generateLink called with correct params ──────────────────────────────────

  it('200 — generateLink is called with type recovery and correct redirectTo', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'recovery',
        email: 'user@example.com',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('reset-password'),
        }),
      })
    )
  })

  // ── OPTIONS / CORS ───────────────────────────────────────────────────────────

  it('OPTIONS — returns 204 with CORS headers', async () => {
    const res = await OPTIONS(
      new NextRequest('https://test.com/api/resend-setup-email', { method: 'OPTIONS' })
    )
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  // ── Resend called with correct data (integration check) ─────────────────────

  it('200 — Resend API receives correct Authorization header with resend key', async () => {
    setupDb({ resendKey: 'my-secret-resend-key' })
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    expect((resendCall[1]!.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-secret-resend-key'
    )
  })

  it("200 — 'from' address field in Resend payload contains support@epa608practicetest.net", async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.from).toContain('support@epa608practicetest.net')
  })

  it('200 — generateLink is called with lowercase email even when input is mixed-case', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'User@Example.COM' }))

    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com' })
    )
  })

  it('200 — Resend is called exactly once per request (no duplicate sends)', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    const resendCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCalls).toHaveLength(1)
  })

  it('200 — generateLink is called exactly once (no duplicate link generation)', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))

    expect(mockGenerateLink).toHaveBeenCalledTimes(1)
  })

  it('200 — returns JSON with ok: true (not just status 200)', async () => {
    setupDb()
    mockGenerateLink.mockResolvedValue({
      data: { properties: { action_link: RECOVERY_LINK } },
    })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true })
  })
})
