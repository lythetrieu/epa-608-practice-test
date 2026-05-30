import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Recovery → hand the token to the reset-password page (client establishes the
  // session and lets the user set a new password). Never bounce recovery to /login.
  if (type === 'recovery') {
    const target = new URL(`${origin}/reset-password`)
    if (tokenHash) {
      target.searchParams.set('token_hash', tokenHash)
      target.searchParams.set('type', 'recovery')
    } else if (code) {
      target.searchParams.set('code', code)
    }
    return NextResponse.redirect(target.toString())
  }

  // Email confirmation (signup / magic link / invite) arrives as token_hash.
  // Forward to the client /auth/confirm page, which shows a "Confirming…" screen
  // IMMEDIATELY (no blank) and verifies client-side. This is a fast redirect with
  // no server verifyOtp round-trip, so the user never sees an about:blank tab.
  if (tokenHash) {
    const target = new URL(`${origin}/auth/confirm`)
    target.searchParams.set('token_hash', tokenHash)
    if (type) target.searchParams.set('type', type)
    target.searchParams.set('next', next)
    return NextResponse.redirect(target.toString())
  }

  // OAuth (Google) returns ?code= with the PKCE verifier present in the browser
  // because the flow was initiated client-side → exchange server-side.
  if (code) {
    const response = NextResponse.redirect(`${origin}/welcome?next=${encodeURIComponent(next)}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            })
          },
        },
      },
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
