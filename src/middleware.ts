// Middleware v3 — guest AI endpoint bypass
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/test',
  '/progress',
  '/admin',
  '/api/questions',
  '/api/submit',
  '/api/sessions',
  '/api/ai',
  '/api/downloads',
  '/api/app',
]

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ['/login', '/signup']

// The private application surface lives on app.epa608practicetest.net. It shares
// this Vercel deployment with the marketing root, so SEO must be host-gated: the
// app subdomain must NEVER be indexed (it would duplicate the marketing root and
// cannibalize rankings). We attach X-Robots-Tag: noindex to every app-subdomain
// response. robots.txt intentionally stays "Allow: /" so Googlebot can still
// crawl the page and SEE this header — that is what actually drops the URL from
// the index. The root domain (different Host) is never touched.
export const APP_HOST = 'app.epa608practicetest.net'

export function isAppHost(request: Pick<NextRequest, 'headers'>): boolean {
  return (request.headers.get('host') ?? '').split(':')[0] === APP_HOST
}

export function tagNoindex(response: NextResponse, appHost: boolean): NextResponse {
  if (appHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

// Where the app-subdomain root ("/") sends a visitor: confirmed users go to the
// dashboard, everyone else to login. The marketing root domain never uses this.
export function appRootRedirectPath(isConfirmedUser: boolean): string {
  return isConfirmedUser ? '/learn' : '/login'
}

export async function middleware(request: NextRequest) {
  const appHost = isAppHost(request)
  let supabaseResponse = NextResponse.next({ request })

  // Static marketing .html files are served on BOTH hosts (same deployment).
  // On the app subdomain they would be crawlable duplicates of the marketing
  // pages, so attach noindex there. Do this BEFORE any Supabase work so these
  // static requests stay cheap on the marketing root (no auth round-trip).
  if (request.nextUrl.pathname.endsWith('.html')) {
    return tagNoindex(NextResponse.next(), appHost)
  }

  // Public endpoints — skip ALL auth work (no getUser round-trip). These routes
  // never read the session, so paying for createServerClient + getUser here was
  // pure latency. Moved ABOVE the Supabase block for that reason. No session
  // cookies to forward (getUser hasn't run), so this mirrors the .html early
  // return: just tagNoindex.
  if (
    request.nextUrl.pathname === '/api/ai/guest-chat' ||
    request.nextUrl.pathname.startsWith('/api/public/')
  ) {
    return tagNoindex(NextResponse.next({ request }), appHost)
  }

  // During build or if env vars are missing, skip auth checks
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return tagNoindex(supabaseResponse, appHost)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          // Mutate request cookies so downstream code sees fresh values
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // Rebuild the response so the browser also receives the updated cookies
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not add any logic between createServerClient and the auth call
  // that could prevent the cookie refresh from working correctly.
  //
  // PERF 2A: getClaims() replaces getUser(). getUser() ALWAYS hits the Supabase
  // Auth server (network round-trip on every request). getClaims() decodes and
  // verifies the JWT LOCALLY:
  //   • Asymmetric tokens (RS256/ES256, once the project migrates to signing
  //     keys) are verified with a cached JWKS public key → ZERO network calls.
  //   • Symmetric tokens (HS256, the current default) can't be verified with a
  //     public key, so getClaims() transparently falls back to a single
  //     getUser() network call — identical security to today. So shipping this
  //     BEFORE the owner enables asymmetric keys is safe: same behavior, and the
  //     round-trip vanishes automatically the moment signing keys are migrated.
  // Under the hood getClaims() (no jwt arg) calls getSession(), which runs the
  // SSR cookie adapter's getAll/setAll — so an EXPIRED access token is still
  // refreshed and the rotated cookies are still written into supabaseResponse
  // via setAll, exactly as with getUser(). The withSessionCookies pattern below
  // therefore remains load-bearing and unchanged.
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims ?? null

  // Reconstruct the minimal user surface the rest of this file needs from the
  // JWT claims, so no downstream logic has to change:
  //   • user presence  → valid claims exist (claims !== null)
  //   • user id        → claims.sub
  //   • user email     → claims.email
  // Email-confirmation mapping (was `user.email_confirmed_at`):
  //   Supabase mirrors auth.users.email_confirmed_at into the JWT as the boolean
  //   `user_metadata.email_verified` (true once the email is confirmed; OAuth
  //   providers set it true too). That is the JWT-native equivalent of the old
  //   `email_confirmed_at != null` check.
  //   Conservative fallback for a MISSING key: in this project a session (hence a
  //   JWT) only exists AFTER confirmation — signup clears cookies and returns no
  //   session until the user clicks the confirm link ("Confirm email" is ON),
  //   and admin-created accounts (fulfillment / resend-setup) are minted with
  //   email_confirm: true. So "claims exist" already implies "confirmed" for the
  //   overwhelming majority of real sessions. We therefore treat the user as
  //   confirmed UNLESS email_verified is EXPLICITLY false — that preserves the
  //   genuine unconfirmed-session case (the `user && !email_confirmed_at` branch
  //   below) while never falsely bouncing a confirmed user whose JWT simply omits
  //   the key. Only an explicit `email_verified: false` is treated as unconfirmed.
  const user = claims
    ? {
        id: claims.sub as string,
        email: claims.email as string | undefined,
        email_confirmed:
          (claims.user_metadata as { email_verified?: boolean } | undefined)
            ?.email_verified !== false,
      }
    : null

  // getClaims() may have ROTATED the refresh token (via getSession), writing new
  // auth cookies into supabaseResponse. EVERY response we return from here on
  // must carry those cookies — returning a fresh NextResponse without them
  // strands the browser on a revoked refresh token and silently kills the
  // session (user gets asked to log in again on their next visit).
  const withSessionCookies = <T extends NextResponse>(resp: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => resp.cookies.set(cookie))
    return resp
  }

  // Cross-subdomain login flag for the STATIC marketing nav. NOT the session —
  // just "is someone signed in" — so marketing pages can show "Dashboard →" vs
  // "Sign In". Shared across .epa608practicetest.net, JS-readable (no token); it
  // never touches the real auth cookies, so it cannot break login.
  const flagHost = (request.headers.get("host") ?? "").split(":")[0]
  const flagProd = flagHost.endsWith("epa608practicetest.net")
  const setAuthFlag = (resp: NextResponse): NextResponse => {
    const loggedIn = Boolean(user && user.email_confirmed)
    resp.cookies.set("epa608_auth", loggedIn ? "1" : "", {
      domain: flagProd ? ".epa608practicetest.net" : undefined,
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: flagProd,
      maxAge: loggedIn ? 60 * 60 * 24 * 30 : 0,
    })
    return resp
  }

  const { pathname } = request.nextUrl

  // (Public-endpoint bypass moved above the Supabase block — see top of fn.)

  // App subdomain root → route users INTO the app instead of serving the 108KB
  // marketing homepage (which belongs to the marketing root domain). Host-gated:
  // the root domain's "/" is NEVER touched — it keeps the marketing homepage.
  // Runs after getClaims() so we can send confirmed users straight to /dashboard.
  if (appHost && pathname === '/') {
    const dest = request.nextUrl.clone()
    dest.pathname = appRootRedirectPath(Boolean(user && user.email_confirmed))
    dest.search = ''
    return tagNoindex(withSessionCookies(NextResponse.redirect(dest)), appHost)
  }

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Unauthenticated or unconfirmed user hitting a protected route
  if (isProtected && (!user || !user.email_confirmed)) {
    // API routes: return 401 JSON (not redirect)
    if (pathname.startsWith('/api/')) {
      return tagNoindex(withSessionCookies(new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })), appHost)
    }
    if (user && !user.email_confirmed) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/signup'
      loginUrl.searchParams.set('error', 'Please confirm your email first')
      return tagNoindex(withSessionCookies(NextResponse.redirect(loginUrl)), appHost)
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return tagNoindex(withSessionCookies(NextResponse.redirect(loginUrl)), appHost)
  }

  // Authenticated user hitting an auth route → redirect to dashboard
  // BUT only if email is confirmed
  if (isAuthRoute && user && user.email_confirmed) {
    return tagNoindex(withSessionCookies(NextResponse.redirect(new URL('/learn', request.url))), appHost)
  }

  // Always return supabaseResponse so cookie mutations are preserved
  return tagNoindex(setAuthFlag(supabaseResponse), appHost)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - Common image extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|txt|xml|ico)$).*)',
  ],
}
