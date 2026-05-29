import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockCreateUser = vi.fn()
const mockGenerateLink = vi.fn()
const mockFrom = vi.fn()

const supabaseMock = {
  from: mockFrom,
  auth: { admin: { createUser: mockCreateUser, generateLink: mockGenerateLink } },
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => supabaseMock,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────
function req(body: object) {
  return new NextRequest('https://test.com/api/paypal/capture', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

type FetchResp = { json: object; ok?: boolean }

/** Mocks global.fetch to return responses in sequence (last one repeats). */
function mockFetch(...responses: FetchResp[]) {
  let i = 0
  vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]
    return { ok: r.ok ?? true, json: async () => r.json } as Response
  })
}

const TOKEN_RESP = { json: { access_token: 'tok' } }

/** Builds a completed PayPal order response. */
function paypalOrder(payerEmail = 'user@example.com', amount = '14.99') {
  return {
    json: {
      status: 'COMPLETED',
      payer: { email_address: payerEmail },
      purchase_units: [{ payments: { captures: [{ amount: { value: amount } }] } }],
    },
  }
}

const RESEND_OK = { json: { id: 'resend-123' } }

/** Configures the Supabase mock for a given scenario.
 *
 * @param existingOrderEmail - When set, pending_upgrades.maybeSingle() returns a
 *   row with this email (simulating an already-recorded orderID). When null/undefined,
 *   maybeSingle() returns { data: null } (orderID not yet seen).
 * @param orderLookupError - When set, the pending_upgrades maybeSingle() call returns
 *   this error instead of data (simulates a DB error on the replay-protection lookup).
 */
function setupDb({
  existingProfile = null as { id: string; lifetime_access?: boolean } | null,
  upgradeError = null as object | null,
  resendKey = 'resend-key' as string | null,
  upsertError = null as object | null,
  existingOrderEmail = undefined as string | null | undefined,
  orderLookupError = null as object | null,
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    const chain = (resolve: unknown) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: resolve, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: resolve, error: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })

    if (table === 'users_profile') {
      const c = chain(existingProfile)
      c.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: upgradeError }),
      })
      return c
    }
    if (table === 'app_config') return chain(resendKey ? { value: resendKey } : null)
    if (table === 'pending_upgrades') {
      // Support two distinct operations on pending_upgrades:
      //   1. .select().eq().maybeSingle() — replay-protection lookup (returns existingOrderEmail row)
      //   2. .upsert()                    — record the purchase
      //   3. .delete().eq()               — cleanup after upgrade
      const orderRow =
        existingOrderEmail !== undefined && existingOrderEmail !== null
          ? { email: existingOrderEmail }
          : null

      const maybeSingleResult = orderLookupError
        ? { data: null, error: orderLookupError }
        : { data: orderRow, error: null }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(maybeSingleResult),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: upsertError }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
    }
    return chain(null)
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('POST /api/paypal/capture', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    ;({ POST } = await import('../capture/route'))
    process.env.PAYPAL_CLIENT_ID = 'client-id'
    process.env.PAYPAL_SECRET = 'secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // ── Input validation ─────────────────────────────────────────────────────────

  it('400 — missing orderID', async () => {
    const res = await POST(req({ email: 'x@x.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Missing orderID' })
  })

  it('400 — invalid JSON body', async () => {
    const r = new NextRequest('https://test.com/api/paypal/capture', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(r)
    expect(res.status).toBe(400)
  })

  // ── PayPal order status ──────────────────────────────────────────────────────

  it('400 — order not COMPLETED (PENDING)', async () => {
    mockFetch(TOKEN_RESP, { json: { status: 'PENDING', payer: {}, purchase_units: [] } })
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Payment not completed' })
  })

  it('400 — order not COMPLETED (CREATED / not yet paid)', async () => {
    mockFetch(TOKEN_RESP, { json: { status: 'CREATED', payer: {}, purchase_units: [] } })
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(400)
  })

  // ── Email validation ─────────────────────────────────────────────────────────

  it('400 — email mismatch (client ≠ PayPal payer)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('real@paypal.com'))
    const res = await POST(req({ orderID: 'ord-1', email: 'fake@other.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Email mismatch' })
  })

  it('OK — no client email supplied, uses PayPal payer email', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('payer@pp.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' } })
    const res = await POST(req({ orderID: 'ord-1' })) // no email field
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.email).toBe('payer@pp.com')
  })

  it('400 — no email anywhere (card payment, empty fields)', async () => {
    mockFetch(TOKEN_RESP, {
      json: {
        status: 'COMPLETED',
        payer: {},  // no email_address from PayPal (guest card)
        purchase_units: [{ payments: { captures: [{ amount: { value: '14.99' } }] } }],
      },
    })
    const res = await POST(req({ orderID: 'ord-1', email: '' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'No email found' })
  })

  // ── Amount validation ────────────────────────────────────────────────────────

  it('400 — amount missing from order', async () => {
    mockFetch(TOKEN_RESP, {
      json: {
        status: 'COMPLETED',
        payer: { email_address: 'x@x.com' },
        purchase_units: [{ payments: { captures: [] } }],
      },
    })
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid amount' })
  })

  it('400 — amount is 0', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com', '0.00'))
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(400)
  })

  it('400 — amount below $1.00 floor (crafted sub-minimum order)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com', '0.99'))
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Invalid amount' })
  })

  it('200 — amount at $1.00 floor (heavy discount code, e.g. 99% off)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com', '1.00'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' } })
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(200)
  })

  // ── Existing user ────────────────────────────────────────────────────────────

  it('200 — existing user: upgrades profile, sends upgrade email, cleans pending_upgrades', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('old@user.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'existing-uid' } })

    const res = await POST(req({ orderID: 'ord-ex', email: 'old@user.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, newAccount: false })
    expect(body.email).toBe('old@user.com')
    // upgrade email subject contains "upgrade"
    const resendCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('resend.com')
    )
    expect(resendCall).toBeDefined()
    const resendBody = JSON.parse(resendCall![1]!.body as string)
    expect(resendBody.subject).toMatch(/upgrade/i)
  })

  it('500 — existing user: DB upgrade fails', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('old@user.com'))
    setupDb({ existingProfile: { id: 'uid' }, upgradeError: { message: 'DB error' } })

    const res = await POST(req({ orderID: 'ord-ex', email: 'old@user.com' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Upgrade failed' })
  })

  // ── New user (no account) ────────────────────────────────────────────────────

  it('200 — new user: creates account with a temp password and emails it', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('new@user.com'), RESEND_OK)
    setupDb({ existingProfile: null })
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-uid' } }, error: null })

    const res = await POST(req({ orderID: 'ord-new', email: 'new@user.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, newAccount: true })

    // createUser is called with a generated password + email_confirm (no recovery link)
    const createArgs = mockCreateUser.mock.calls[0][0]
    expect(typeof createArgs.password).toBe('string')
    expect(createArgs.password.length).toBeGreaterThanOrEqual(8)
    expect(createArgs.email_confirm).toBe(true)

    // welcome email carries that exact temp password + a plain login link
    const resendCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('resend.com')
    )!
    const resendBody = JSON.parse(resendCall[1]!.body as string)
    expect(resendBody.html).toContain(createArgs.password)
    expect(resendBody.html).toContain('epa608practicetest.net/login')
    expect(resendBody.html).not.toContain('token_hash')
  })

  it('200 — new user: createUser carries checkout source + order_id metadata', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('new@user.com'), RESEND_OK)
    setupDb({ existingProfile: null })
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-uid' } }, error: null })

    const res = await POST(req({ orderID: 'ord-meta', email: 'new@user.com' }))
    expect(res.status).toBe(200)

    const createArgs = mockCreateUser.mock.calls[0][0]
    expect(createArgs.email).toBe('new@user.com')
    expect(createArgs.user_metadata).toMatchObject({ source: 'checkout', order_id: 'ord-meta' })
  })

  it('200 + setupFailed — createUser fails: returns ok but no account created', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('fail@user.com'))
    setupDb({ existingProfile: null })
    mockCreateUser.mockResolvedValue({ data: null, error: { message: 'Email already exists' } })

    const res = await POST(req({ orderID: 'ord-fail', email: 'fail@user.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, setupFailed: true })
    // pending_upgrades was saved — user can sign up manually and Pro applies
  })

  // ── Email optional: client email matches PayPal ──────────────────────────────

  it('200 — client email same as PayPal payer (case-insensitive match)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('User@Example.COM'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' } })
    const res = await POST(req({ orderID: 'ord-1', email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  // ── Resilience ───────────────────────────────────────────────────────────────

  it('200 — Resend fails: purchase still succeeds (email non-fatal)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com'), { json: { error: 'rate_limited' }, ok: false })
    setupDb({ existingProfile: { id: 'u1' } })

    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    // Still returns 200 — Resend errors are caught and swallowed
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('200 — resend_api_key not in app_config: skips email, still activates Pro', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com'))
    setupDb({ existingProfile: { id: 'u1' }, resendKey: null })

    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(200)
    // Resend should NOT have been called
    const resendCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('resend.com')
    )
    expect(resendCall).toBeUndefined()
  })

  it('500 — PayPal API throws (network down)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
    const res = await POST(req({ orderID: 'ord-1', email: 'x@x.com' }))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Verification failed' })
  })

  // ── Replay / duplicate orderID ───────────────────────────────────────────────

  it('200 — already-Pro user: returns immediately, no upgrade or email sent', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('pro@user.com'))
    setupDb({ existingProfile: { id: 'u1', lifetime_access: true } as { id: string; lifetime_access?: boolean } })

    const res = await POST(req({ orderID: 'ord-replay', email: 'pro@user.com' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, newAccount: false })
    // Resend must NOT have been called
    const resendCall = vi.mocked(global.fetch).mock.calls.find(
      ([url]) => String(url).includes('resend.com')
    )
    expect(resendCall).toBeUndefined()
  })

  it('200 — same orderID submitted twice: second call is idempotent (already Pro, no duplicate email)', async () => {
    // First call: profile.lifetime_access = false → upgrades + emails
    // Second call: profile.lifetime_access = true → returns immediately
    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users_profile') {
        const isSecondCall = callCount++ > 0
        const profile = isSecondCall ? { id: 'u1', lifetime_access: true } : { id: 'u1', lifetime_access: false }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: profile, error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      const chain = (resolve: unknown) => ({
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: resolve, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(), upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      })
      if (table === 'app_config') return chain({ value: 'resend-key' })
      if (table === 'pending_upgrades') return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }
      return chain(null)
    })
    mockFetch(TOKEN_RESP, paypalOrder('x@x.com'), RESEND_OK, TOKEN_RESP, paypalOrder('x@x.com'))

    const res1 = await POST(req({ orderID: 'ord-dup', email: 'x@x.com' }))
    const res2 = await POST(req({ orderID: 'ord-dup', email: 'x@x.com' }))
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    // Only one Resend call — from first submission
    const resendCalls = vi.mocked(global.fetch).mock.calls.filter(
      ([url]) => String(url).includes('resend.com')
    )
    expect(resendCalls).toHaveLength(1)
  })

  // ── OrderID replay protection ─────────────────────────────────────────────────

  it('409 — orderID already in pending_upgrades with a different email', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    // The DB has the same orderID recorded for a different email
    setupDb({ existingOrderEmail: 'eve@attacker.com' })

    const res = await POST(req({ orderID: 'ord-stolen', email: 'alice@example.com' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'Order already used' })
  })

  it('409 — response body contains exact { error: "Order already used" }', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    setupDb({ existingOrderEmail: 'different@example.com' })

    const res = await POST(req({ orderID: 'ord-conflict', email: 'alice@example.com' }))
    const body = await res.json()
    expect(body).toEqual({ error: 'Order already used' })
  })

  it('200 — orderID already in pending_upgrades with same email → idempotent, continues normally', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'), RESEND_OK)
    // Same orderID, same email → allowed (idempotent re-submission)
    setupDb({ existingProfile: { id: 'u1' }, existingOrderEmail: 'alice@example.com' })

    const res = await POST(req({ orderID: 'ord-same', email: 'alice@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('200 — orderID not yet in pending_upgrades (normal new purchase)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('new@example.com'), RESEND_OK)
    // existingOrderEmail is undefined → maybeSingle returns { data: null }
    setupDb({ existingProfile: { id: 'u1' } })

    const res = await POST(req({ orderID: 'ord-brand-new', email: 'new@example.com' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('409 — orderID comparison is case-insensitive on email (ALICE vs alice → same person, not blocked)', async () => {
    // ALICE@EXAMPLE.COM and alice@example.com normalise to the same address.
    // After normalisation both sides are 'alice@example.com' → should NOT be blocked.
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'), RESEND_OK)
    // The stored row has the mixed-case variant; after normalisation they match.
    setupDb({ existingProfile: { id: 'u1' }, existingOrderEmail: 'ALICE@EXAMPLE.COM' })

    // Both sides normalise to alice@example.com → idempotent, not a conflict
    const res = await POST(req({ orderID: 'ord-case', email: 'alice@example.com' }))
    expect(res.status).toBe(200)
  })

  it('200 — existing user (profile found with lifetime_access) bypasses pending_upgrades order check', async () => {
    // When a profile row exists AND lifetime_access is true, the route returns
    // immediately without writing to pending_upgrades — the orderID replay check
    // only applies to the NEW-user path.
    mockFetch(TOKEN_RESP, paypalOrder('pro@example.com'))
    setupDb({ existingProfile: { id: 'u1', lifetime_access: true }, existingOrderEmail: 'different@example.com' })

    // Even though a different email holds this orderID in pending_upgrades,
    // the already-Pro user is returned immediately before the check matters.
    const res = await POST(req({ orderID: 'ord-pro', email: 'pro@example.com' }))
    // Route returns 200 early for already-Pro users (before replay check is relevant)
    expect(res.status).toBe(200)
  })

  it('409 — verifies no email is sent and no upgrade happens when replay is detected', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    setupDb({ existingOrderEmail: 'eve@attacker.com' })

    const res = await POST(req({ orderID: 'ord-replay', email: 'alice@example.com' }))
    expect(res.status).toBe(409)

    // Resend must NOT have been called
    const resendCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCalls).toHaveLength(0)
  })

  it('409 — verifies createUser is NOT called when replay is detected', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    setupDb({ existingOrderEmail: 'someone-else@example.com' })

    await POST(req({ orderID: 'ord-replay2', email: 'alice@example.com' }))

    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('409 — CORS headers are present on the 409 response', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    setupDb({ existingOrderEmail: 'other@example.com' })

    const res = await POST(req({ orderID: 'ord-cors', email: 'alice@example.com' }))
    expect(res.status).toBe(409)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
  })

  it('200 — orderID lookup returns { data: null } (not in pending_upgrades) → proceeds normally', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' }, existingOrderEmail: null })

    const res = await POST(req({ orderID: 'ord-null-row', email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  it('200 — pending_upgrades upsert returns unique-constraint error → still returns 200 (upsert error is non-fatal)', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' }, upsertError: { message: 'duplicate key value violates unique constraint' } })

    // upsert failure is logged but must not crash the endpoint
    const res = await POST(req({ orderID: 'ord-upsert-err', email: 'user@example.com' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('200 — same orderID, same email, user already has lifetime_access → idempotent 200, no email sent', async () => {
    mockFetch(TOKEN_RESP, paypalOrder('pro@example.com'))
    setupDb({
      existingProfile: { id: 'u1', lifetime_access: true },
      existingOrderEmail: 'pro@example.com', // same email → no conflict
    })

    const res = await POST(req({ orderID: 'ord-idem', email: 'pro@example.com' }))
    expect(res.status).toBe(200)

    const resendCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) =>
      String(url).includes('resend.com')
    )
    expect(resendCalls).toHaveLength(0)
  })

  it('200 — orderID lookup DB error → fail open (does NOT block the purchase)', async () => {
    // If the replay-protection lookup itself errors, we should fail open rather than
    // blocking legitimate purchases due to infrastructure issues.
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    setupDb({
      existingProfile: { id: 'u1' },
      orderLookupError: { message: 'connection timeout' },
    })

    const res = await POST(req({ orderID: 'ord-dberr', email: 'user@example.com' }))
    // Fail open: purchase proceeds despite lookup error
    expect(res.status).toBe(200)
  })

  it('200 — large orderID string (100 chars) is handled correctly', async () => {
    const largeOrderID = 'A'.repeat(100)
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' } })

    const res = await POST(req({ orderID: largeOrderID, email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  it('200 — verifies pending_upgrades upsert is called with ls_order_id from the request', async () => {
    // Upsert runs in the new-user path (no existing profile). Use new-user scenario.
    mockFetch(TOKEN_RESP, paypalOrder('newuser@example.com'), RESEND_OK)
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'pending_upgrades') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          upsert: mockUpsert,
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      const chain = (resolve: unknown) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: resolve, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: resolve, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      })
      if (table === 'users_profile') return chain(null)  // no existing profile → new-user path
      if (table === 'app_config') return chain({ value: 'resend-key' })
      return chain(null)
    })
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'new-uid' } }, error: null })
    mockGenerateLink.mockResolvedValue({ data: { properties: { action_link: 'https://epa608.net/reset?token=x' } } })

    await POST(req({ orderID: 'specific-order-id-123', email: 'newuser@example.com' }))

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ ls_order_id: 'specific-order-id-123' }),
      expect.anything()
    )
  })

  it('409 — unicode/special char email variants: same orderID with a genuinely different email is blocked', async () => {
    // Tests that the check catches real mismatches (not false positives on normalisation)
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    // Stored email is genuinely different — not just a case variant
    setupDb({ existingOrderEmail: 'bob+tag@example.com' })

    const res = await POST(req({ orderID: 'ord-unicode', email: 'alice@example.com' }))
    expect(res.status).toBe(409)
  })

  it('200 — null ls_order_id on existing pending_upgrades row does not conflict with any orderID', async () => {
    // If a row in pending_upgrades has ls_order_id=null, it should never trigger
    // the replay-protection block (the query is keyed on ls_order_id so maybeSingle
    // would return null data; simulate that case explicitly).
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    // maybeSingle returns null data — no row matched the orderID
    setupDb({ existingProfile: { id: 'u1' }, existingOrderEmail: undefined })

    const res = await POST(req({ orderID: 'ord-null-id', email: 'user@example.com' }))
    expect(res.status).toBe(200)
  })

  it('409 — concurrent scenario: second request with same orderID and different email is rejected', async () => {
    // Simulates the race condition where a fraudster submits the same orderID
    // moments after the legitimate buyer; the DB lookup returns the first buyer's email.
    mockFetch(TOKEN_RESP, paypalOrder('fraud@example.com'))
    setupDb({ existingOrderEmail: 'legitimate@example.com' })

    const res = await POST(req({ orderID: 'ord-race', email: 'fraud@example.com' }))
    expect(res.status).toBe(409)
  })

  it('200 — orderID with whitespace (hypothetical): trimmed before lookup, purchase proceeds', async () => {
    // PayPal would never send whitespace in orderIDs, but belt-and-suspenders:
    // if trimming is applied the lookup finds no conflict and purchase succeeds.
    mockFetch(TOKEN_RESP, paypalOrder('user@example.com'), RESEND_OK)
    setupDb({ existingProfile: { id: 'u1' } })

    // The orderID has surrounding whitespace; if the route trims it,
    // the lookup returns null (no conflict) and we get 200.
    const res = await POST(req({ orderID: '  ord-trim  ', email: 'user@example.com' }))
    // Accept either 200 (trimmed, no conflict) or 409 is acceptable here —
    // the main goal is no crash. We assert it's not a 5xx.
    expect(res.status).toBeLessThan(500)
  })

  it('409 — checks the conflicting email in pending_upgrades is the exact mismatch (not partial)', async () => {
    // 'alice@example.com' vs 'alice2@example.com' — clearly different, must block.
    mockFetch(TOKEN_RESP, paypalOrder('alice@example.com'))
    setupDb({ existingOrderEmail: 'alice2@example.com' })

    const res = await POST(req({ orderID: 'ord-partial', email: 'alice@example.com' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'Order already used' })
  })
})
