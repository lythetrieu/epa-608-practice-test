// Establishing an auth session from a password-recovery / account-setup link.
//
// Recovery links reach the app in three shapes depending on how they were
// generated and on the project's auth flow settings:
//   1. ?token_hash=...&type=recovery   → verifyOtp({ type, token_hash })
//   2. ?code=...                       → exchangeCodeForSession(code)   (PKCE)
//   3. #access_token=...&refresh_token=... (implicit hash) → setSession(...)
//
// This is extracted from the component so it can be unit-tested without a DOM
// renderer. It takes only what it needs: a minimal Supabase auth surface and
// the current URL.

export type RecoveryAuth = {
  getSession: () => Promise<{ data: { session: unknown | null } }>
  verifyOtp: (args: { type: 'recovery'; token_hash: string }) => Promise<{ error: unknown | null }>
  exchangeCodeForSession: (code: string) => Promise<{ error: unknown | null }>
  setSession: (args: { access_token: string; refresh_token: string }) => Promise<{ error: unknown | null }>
}

export type RecoveryResult =
  | { state: 'ready'; cleanUrl: string | null }
  | { state: 'invalid' }

/** Shape of `properties` returned by supabase admin.generateLink. */
export type GeneratedLinkProperties = {
  action_link?: string
  hashed_token?: string
  redirect_to?: string
} | null | undefined

/**
 * Builds the password-setup / recovery URL to email a user.
 *
 * Prefers a self-built link pointing straight at the app's reset page with the
 * `token_hash` in the query string, e.g.
 *   https://app/reset-password?token_hash=...&type=recovery
 * The app then calls `verifyOtp({ token_hash })`, which works in any browser and
 * does NOT require a PKCE code_verifier (the link was generated server-side, so a
 * `?code=` action_link would be unusable in the user's browser).
 *
 * Falls back to Supabase's own `action_link`, and finally to a forgot-password
 * link, so a missing/odd response never produces a dead button.
 */
export function buildSetupLink(
  properties: GeneratedLinkProperties,
  opts: { resetUrl: string; forgotUrl: string; email: string },
): string {
  const hashed = properties?.hashed_token
  if (hashed) {
    const u = new URL(opts.resetUrl)
    u.searchParams.set('token_hash', hashed)
    u.searchParams.set('type', 'recovery')
    return u.toString()
  }
  if (properties?.action_link) return properties.action_link
  return `${opts.forgotUrl}?email=${encodeURIComponent(opts.email)}`
}

/**
 * Attempts to establish a recovery session from the given URL.
 *
 * Returns `{ state: 'ready', cleanUrl }` if a session exists or was created
 * (cleanUrl is the path the caller should replace history with, to strip the
 * token; null when nothing needs stripping). Returns `{ state: 'invalid' }`
 * when the link carries no usable credentials or verification failed.
 */
export async function establishRecoverySession(
  auth: RecoveryAuth,
  href: string,
): Promise<RecoveryResult> {
  const url = new URL(href)
  const params = url.searchParams
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

  // A session may already exist — e.g. supabase-js detectSessionInUrl already
  // consumed an implicit hash before this ran.
  const existing = await auth.getSession()
  if (existing.data.session) {
    // A session is already present (e.g. detectSessionInUrl consumed an implicit
    // hash). Strip leftover tokens from the URL if any are still present.
    const hasTokenInUrl = url.hash !== '' || params.has('code') || params.has('token_hash')
    return { state: 'ready', cleanUrl: hasTokenInUrl ? url.pathname : null }
  }

  const tokenHash = params.get('token_hash')
  const code = params.get('code')
  const accessToken = hash.get('access_token')
  const refreshToken = hash.get('refresh_token')

  try {
    if (tokenHash) {
      const { error } = await auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
      if (error) return { state: 'invalid' }
    } else if (code) {
      const { error } = await auth.exchangeCodeForSession(code)
      if (error) return { state: 'invalid' }
    } else if (accessToken && refreshToken) {
      const { error } = await auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      if (error) return { state: 'invalid' }
    } else {
      return { state: 'invalid' }
    }
  } catch {
    return { state: 'invalid' }
  }

  return { state: 'ready', cleanUrl: url.pathname }
}
