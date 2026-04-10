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
]

// Routes that authenticated users should be redirected away from
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // IMPORTANT: Do not add any logic between createServerClient and auth.getUser()
  // that could prevent the cookie refresh from working correctly.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Unauthenticated or unconfirmed user hitting a protected route → redirect to login
  if (isProtected && (!user || !user.email_confirmed_at)) {
    // If unconfirmed, sign them out first
    if (user && !user.email_confirmed_at) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/signup'
      loginUrl.searchParams.set('error', 'Please confirm your email first')
      return NextResponse.redirect(loginUrl)
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user hitting an auth route → redirect to dashboard
  // BUT only if email is confirmed
  if (isAuthRoute && user && user.email_confirmed_at) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Always return supabaseResponse so cookie mutations are preserved
  return supabaseResponse
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
