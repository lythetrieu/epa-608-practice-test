import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockUpdateUserById = vi.fn()
const mockGetUserById = vi.fn()
const mockFrom = vi.fn()

const supabaseMock = {
  from: mockFrom,
  auth: { admin: { updateUserById: mockUpdateUserById, getUserById: mockGetUserById } },
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

/**
 * Configures Supabase mock for resend-setup-email scenarios.
 * users_profile lookup returns `existingProfile` if provided, null otherwise.
 * app_config returns the resend key if `resendKey` is non-null.
 * updateUserById resolves OK unless `updateError` is provided.
 */
function setupDb({
  existingProfile = { id: 'user-uid' } as { id: string } | null,
  resendKey = 'resend-key-abc' as string | null,
  updateError = null as unknown,
  lastSignInAt = null as string | null,
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
  mockGetUserById.mockResolvedValue({ data: { user: { id: 'user-uid', last_sign_in_at: lastSignInAt } }, error: null })
  mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'user-uid' } }, error: updateError })
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('POST /api/resend-setup-email', () => {
  let POST: (req: NextRequest) => Promise<Response>
  let OPTIONS: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => supabaseMock }))
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

  it('429 — rate limited', async () => {
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

  // ── Success: temp password is reset and emailed ──────────────────────────────

  it('200 — user found, password reset, email sent', async () => {
    setupDb()
    mockFetch(RESEND_OK)
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('200 — updateUserById is called with a password and email_confirm', async () => {
    setupDb()
    mockFetch(RESEND_OK)
    await POST(req({ email: 'user@example.com' }))
    expect(mockUpdateUserById).toHaveBeenCalledTimes(1)
    const [uid, attrs] = mockUpdateUserById.mock.calls[0]
    expect(uid).toBe('user-uid')
    expect(typeof attrs.password).toBe('string')
    expect(attrs.password.length).toBeGreaterThanOrEqual(8)
    expect(attrs.email_confirm).toBe(true)
  })

  it('200 — the emailed temp password matches the one set on the account', async () => {
    setupDb()
    mockFetch(RESEND_OK)
    await POST(req({ email: 'user@example.com' }))
    const setPassword = mockUpdateUserById.mock.calls[0][1].password as string
    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.html).toContain(setPassword)
  })

  it('200 — email goes to the right recipient with a login link (no recovery link)', async () => {
    setupDb()
    mockFetch(RESEND_OK)
    await POST(req({ email: 'recipient@example.com' }))
    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.to).toContain('recipient@example.com')
    expect(body.html).toContain('epa608practicetest.net/login')
    expect(body.html).not.toContain('token_hash')
  })

  it("200 — Resend 'from' is support@epa608practicetest.net with a subject", async () => {
    setupDb()
    mockFetch(RESEND_OK)
    await POST(req({ email: 'user@example.com' }))
    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    const body = JSON.parse(resendCall[1]!.body as string)
    expect(body.from).toContain('support@epa608practicetest.net')
    expect(typeof body.subject).toBe('string')
    expect(body.subject.length).toBeGreaterThan(0)
  })

  // ── Anti-lockout gate: already-active account ────────────────────────────────

  it('409 — account already signed in before → not rotated, no email', async () => {
    setupDb({ lastSignInAt: '2026-05-01T00:00:00Z' })
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const res = await POST(req({ email: 'active@example.com' }))
    expect(res.status).toBe(409)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
    const resendCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('resend.com'))
    expect(resendCall).toBeUndefined()
  })

  // ── updateUserById failure → 500 (email already sent first) ──────────────────

  it('500 — updateUserById error after email sent → 500 (send-then-rotate order)', async () => {
    setupDb({ updateError: { message: 'boom' } })
    mockFetch(RESEND_OK)
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
    // email is sent BEFORE the password rotation, so a rotation failure does not
    // mean nothing was emailed — but the password was not changed.
    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) => String(url).includes('resend.com'))
    expect(resendCall).toBeDefined()
  })

  // ── Missing resend key → 500 ─────────────────────────────────────────────────

  it('500 — resend_api_key not in app_config → 500 (email is the purpose)', async () => {
    setupDb({ resendKey: null })
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
    const resendCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('resend.com'))
    expect(resendCall).toBeUndefined()
  })

  // ── Resend API failure → 500 ─────────────────────────────────────────────────

  it('500 — Resend returns non-ok → 500', async () => {
    setupDb()
    mockFetch({ json: { error: 'invalid_api_key' }, ok: false })
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  it('500 — Resend throws network error → 500', async () => {
    setupDb()
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  // ── Supabase unexpected error ────────────────────────────────────────────────

  it('500 — Supabase admin client throws unexpected error', async () => {
    mockFrom.mockImplementation(() => { throw new Error('Unexpected Supabase internal error') })
    const res = await POST(req({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })

  // ── Email normalization ──────────────────────────────────────────────────────

  it('200 — uppercase email is normalized to lowercase before lookup', async () => {
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
    mockGetUserById.mockResolvedValue({ data: { user: { id: 'uid', last_sign_in_at: null } }, error: null })
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockFetch(RESEND_OK)

    const res = await POST(req({ email: 'USER@EXAMPLE.COM' }))
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
    mockGetUserById.mockResolvedValue({ data: { user: { id: 'uid', last_sign_in_at: null } }, error: null })
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'uid' } }, error: null })
    mockFetch(RESEND_OK)

    await POST(req({ email: 'user@example.com' }))
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
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

  it('200 — Resend Authorization header carries the resend key', async () => {
    setupDb({ resendKey: 'my-secret-resend-key' })
    mockFetch(RESEND_OK)
    await POST(req({ email: 'user@example.com' }))
    const resendCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('resend.com')
    )!
    expect((resendCall[1]!.headers as Record<string, string>)['Authorization']).toBe(
      'Bearer my-secret-resend-key'
    )
  })

  it('200 — Resend is called exactly once (no duplicate sends)', async () => {
    setupDb()
    mockFetch(RESEND_OK)
    await POST(req({ email: 'user@example.com' }))
    const resendCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCalls).toHaveLength(1)
  })
})
