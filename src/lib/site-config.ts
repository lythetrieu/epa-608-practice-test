// Centralized public URLs. Env-driven so the marketing/app split can be flipped
// without code changes:
//   - NEXT_PUBLIC_APP_URL       → the app (login, dashboard, payment, auth)
//   - NEXT_PUBLIC_MARKETING_URL → the marketing/content site (root)
// Both DEFAULT to the current root domain, so nothing changes until the env vars
// are set (e.g. NEXT_PUBLIC_APP_URL=https://app.epa608practicetest.net once the
// subdomain is live on Vercel).

// Trim first: env vars sometimes arrive with a stray trailing newline/space,
// which silently corrupts success_url sent to Polar and any string-built URL.
const stripSlash = (u: string) => u.trim().replace(/\/+$/, '')

export const APP_URL = stripSlash(process.env.NEXT_PUBLIC_APP_URL ?? 'https://epa608practicetest.net')
export const MARKETING_URL = stripSlash(process.env.NEXT_PUBLIC_MARKETING_URL ?? 'https://epa608practicetest.net')

// Extra origins allowed to call these APIs cross-origin (e.g. the Astro/Cloudflare
// build of the marketing site on *.workers.dev, or a staging domain). Comma-separated.
const EXTRA_ORIGINS = (process.env.NEXT_PUBLIC_EXTRA_ORIGINS ?? 'https://epa608-astro.thetrieu9587.workers.dev,https://app.epa608practicetest.net')
  .split(',').map((u) => stripSlash(u.trim())).filter(Boolean)

const ALLOWED_ORIGINS = [APP_URL, MARKETING_URL, ...EXTRA_ORIGINS]

// True when `origin` is an allowed host. Used to validate the page-origin that
// the checkout passes for Polar embed_origin (a same-origin GET sends no Origin
// header, so the embedding page tells us its origin via a query param).
export function isAllowedOrigin(origin: string): boolean {
  return !!origin && ALLOWED_ORIGINS.includes(stripSlash(origin))
}

/**
 * The request's Origin if it is on the allowlist, else the marketing URL.
 * Use for reflecting CORS AND for Polar `embed_origin` (which must equal the
 * Origin of the page that embeds the checkout iframe, on whichever host it runs).
 */
export function allowedOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : MARKETING_URL
}

/**
 * CORS headers that reflect the request's Origin when it is the app, the
 * marketing site, or an allowed extra origin (the Astro build). Falls back to APP_URL.
 */
export function corsHeaders(req: Request, methods = 'POST, OPTIONS'): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : APP_URL
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  }
}
