import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  const isRecovery = type === 'recovery'

  // A recovery link must NEVER be silently bounced to /login (that was the
  // "both links go to the login page / loop" bug). Hand the token to the
  // reset-password page, which establishes the session client-side via
  // verifyOtp/exchangeCodeForSession and lets the user set a new password.
  if (isRecovery) {
    const target = new URL(`${origin}/reset-password`)
    // Forward whatever credential arrived so the reset page can consume it.
    if (tokenHash) {
      target.searchParams.set('token_hash', tokenHash)
      target.searchParams.set('type', 'recovery')
    } else if (code) {
      target.searchParams.set('code', code)
    }
    return NextResponse.redirect(target.toString())
  }

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
