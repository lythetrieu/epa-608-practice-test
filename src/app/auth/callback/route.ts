import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function getAppOrigin(request: NextRequest): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return new URL(request.url).origin
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'
  const origin = getAppOrigin(request)

  if (code) {
    // Build a response that can carry cookie mutations
    const response = NextResponse.redirect(`${origin}/welcome?next=${encodeURIComponent(next)}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
            })
          },
        },
      },
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery') {
        const recoveryResponse = NextResponse.redirect(`${origin}/reset-password`)
        response.cookies.getAll().forEach(c => recoveryResponse.cookies.set(c.name, c.value))
        return recoveryResponse
      }
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
