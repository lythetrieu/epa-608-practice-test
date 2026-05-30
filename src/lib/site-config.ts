// Centralized public URLs. Env-driven so the marketing/app split can be flipped
// without code changes:
//   - NEXT_PUBLIC_APP_URL       → the app (login, dashboard, payment, auth)
//   - NEXT_PUBLIC_MARKETING_URL → the marketing/content site (root)
// Both DEFAULT to the current root domain, so nothing changes until the env vars
// are set (e.g. NEXT_PUBLIC_APP_URL=https://app.epa608practicetest.net once the
// subdomain is live on Vercel).

const stripSlash = (u: string) => u.replace(/\/+$/, '')

export const APP_URL = stripSlash(process.env.NEXT_PUBLIC_APP_URL ?? 'https://epa608practicetest.net')
export const MARKETING_URL = stripSlash(process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://epa608practicetest.net')

const ALLOWED_ORIGINS = [APP_URL, MARKETING_URL]

/**
 * CORS headers that reflect the request's Origin when it is the app OR the
 * marketing site (free tools on the marketing root call these APIs cross-origin
 * once the app moves to app.subdomain). Falls back to APP_URL.
 */
export function corsHeaders(req: Request, methods = 'POST, OPTIONS'): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : APP_URL
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': methods,
    'Vary': 'Origin',
  }
}
