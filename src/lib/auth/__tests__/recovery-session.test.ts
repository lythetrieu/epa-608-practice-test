import { describe, it, expect, vi } from 'vitest'
import { establishRecoverySession, buildSetupLink, type RecoveryAuth } from '../recovery-session'

const BASE = 'https://epa608practicetest.net/reset-password'

/** Builds a RecoveryAuth stub. By default no session exists and every verb succeeds. */
function makeAuth(overrides: Partial<RecoveryAuth> & { hasSession?: boolean } = {}): {
  auth: RecoveryAuth
  verifyOtp: ReturnType<typeof vi.fn>
  exchangeCodeForSession: ReturnType<typeof vi.fn>
  setSession: ReturnType<typeof vi.fn>
} {
  const verifyOtp = vi.fn(async () => ({ error: null }))
  const exchangeCodeForSession = vi.fn(async () => ({ error: null }))
  const setSession = vi.fn(async () => ({ error: null }))
  const getSession = vi.fn(async () => ({
    data: { session: overrides.hasSession ? { user: { id: 'u1' } } : null },
  }))
  const auth: RecoveryAuth = {
    getSession,
    verifyOtp,
    exchangeCodeForSession,
    setSession,
    ...overrides,
  }
  return { auth, verifyOtp, exchangeCodeForSession, setSession }
}

describe('establishRecoverySession', () => {
  it('uses verifyOtp for a ?token_hash=...&type=recovery link (admin generateLink shape)', async () => {
    const { auth, verifyOtp, exchangeCodeForSession } = makeAuth()
    const res = await establishRecoverySession(auth, `${BASE}?token_hash=abc123&type=recovery`)
    expect(res).toEqual({ state: 'ready', cleanUrl: '/reset-password' })
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc123' })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('uses exchangeCodeForSession for a ?code=... (PKCE) link', async () => {
    const { auth, exchangeCodeForSession, verifyOtp } = makeAuth()
    const res = await establishRecoverySession(auth, `${BASE}?code=pkce-code`)
    expect(res).toEqual({ state: 'ready', cleanUrl: '/reset-password' })
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('uses setSession for an implicit #access_token hash link', async () => {
    const { auth, setSession } = makeAuth()
    const res = await establishRecoverySession(
      auth,
      `${BASE}#access_token=at&refresh_token=rt&type=recovery`,
    )
    expect(res).toEqual({ state: 'ready', cleanUrl: '/reset-password' })
    expect(setSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' })
  })

  it('returns ready without re-verifying when a session already exists', async () => {
    const { auth, verifyOtp, exchangeCodeForSession, setSession } = makeAuth({ hasSession: true })
    const res = await establishRecoverySession(auth, `${BASE}#access_token=at&refresh_token=rt`)
    expect(res.state).toBe('ready')
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(setSession).not.toHaveBeenCalled()
  })

  it('returns invalid when the link carries no recovery credentials', async () => {
    // This is exactly the customer-reported "Auth session missing!" case:
    // the page was opened with no token in the URL and no prior session.
    const { auth } = makeAuth()
    const res = await establishRecoverySession(auth, BASE)
    expect(res).toEqual({ state: 'invalid' })
  })

  it('returns invalid when verifyOtp reports an error (expired/used link)', async () => {
    const { auth } = makeAuth({ verifyOtp: vi.fn(async () => ({ error: { message: 'expired' } })) })
    const res = await establishRecoverySession(auth, `${BASE}?token_hash=stale&type=recovery`)
    expect(res).toEqual({ state: 'invalid' })
  })

  it('returns invalid when exchangeCodeForSession throws (missing PKCE verifier)', async () => {
    const { auth } = makeAuth({
      exchangeCodeForSession: vi.fn(async () => {
        throw new Error('code verifier missing')
      }),
    })
    const res = await establishRecoverySession(auth, `${BASE}?code=server-generated`)
    expect(res).toEqual({ state: 'invalid' })
  })

  it('only strips the URL (cleanUrl) for an existing session when a token is still present', async () => {
    const { auth } = makeAuth({ hasSession: true })
    const clean = await establishRecoverySession(auth, BASE)
    expect(clean).toEqual({ state: 'ready', cleanUrl: null })
  })

  it('round-trips: a link built from hashed_token is resolvable by establishRecoverySession', async () => {
    const link = buildSetupLink(
      { hashed_token: 'h_abc', action_link: 'https://supabase/auth/v1/verify?token=h_abc' },
      {
        resetUrl: 'https://epa608practicetest.net/reset-password',
        forgotUrl: 'https://epa608practicetest.net/forgot-password',
        email: 'buyer@example.com',
      },
    )
    expect(link).toContain('/reset-password?token_hash=h_abc&type=recovery')
    // and the page can consume it
    const { auth, verifyOtp } = makeAuth()
    const res = await establishRecoverySession(auth, link)
    expect(res.state).toBe('ready')
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'h_abc' })
  })
})

describe('buildSetupLink', () => {
  const opts = {
    resetUrl: 'https://epa608practicetest.net/reset-password',
    forgotUrl: 'https://epa608practicetest.net/forgot-password',
    email: 'buyer@example.com',
  }

  it('prefers a token_hash link over the PKCE action_link', () => {
    const link = buildSetupLink({ hashed_token: 'h1', action_link: 'https://sb/auth/v1/verify?token=h1' }, opts)
    expect(link).toBe('https://epa608practicetest.net/reset-password?token_hash=h1&type=recovery')
  })

  it('falls back to action_link when no hashed_token is present', () => {
    const link = buildSetupLink({ action_link: 'https://sb/auth/v1/verify?token=zzz' }, opts)
    expect(link).toBe('https://sb/auth/v1/verify?token=zzz')
  })

  it('falls back to a forgot-password link when properties are empty', () => {
    expect(buildSetupLink(null, opts)).toBe(
      'https://epa608practicetest.net/forgot-password?email=buyer%40example.com',
    )
  })
})
