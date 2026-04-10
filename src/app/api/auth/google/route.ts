import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const next = searchParams.get('next') ?? '/dashboard'

  // Use configured APP_URL to avoid Vercel preview URL mismatch
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }

  return NextResponse.redirect(data.url)
}
