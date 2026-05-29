/**
 * GET /api/team/join-redirect?code=UUID&next=/dashboard
 *
 * Called server-side after OAuth or email confirmation when a join code is
 * present. Calls the join_team RPC, then redirects to `next`.
 *
 * This route is intentionally a GET so it can be used as a redirect target
 * from the Supabase auth callback URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Validate UUID format to avoid passing arbitrary values to the RPC
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(code)) {
    return NextResponse.redirect(`${origin}/dashboard?error=invalid_invite`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not authenticated — send to login and preserve join context
    return NextResponse.redirect(`${origin}/login?join=${code}`)
  }

  const admin = createAdminClient()
  await admin.rpc('join_team', {
    p_invite_code: code,
    p_user_id: user.id,
  })

  // Redirect regardless of join outcome — the user may already be in the team
  return NextResponse.redirect(`${origin}${next}`)
}
