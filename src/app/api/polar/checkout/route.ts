// Server-side checkout redirect (AUTH-FIRST). Identifies the buyer by their
// logged-in Supabase account and passes it to Polar as customer_external_id +
// metadata.user_id, so Pro is granted to the RIGHT account regardless of which
// email they use to pay (the billing email no longer matters for matching).
// If the visitor is not signed in, we send them to log in and come right back.
//
// Needs: POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID on the server.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL } from '@/lib/site-config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
// Node runtime: reads the Supabase session (SSR cookies) to identify the buyer.
export const runtime = 'nodejs'

const back = (q: string) => NextResponse.redirect(`${APP_URL}/pricing.html?checkout=${q}`, 302)

export async function GET(_request: NextRequest) {
  const token = process.env.POLAR_ACCESS_TOKEN
  const productId = process.env.POLAR_PRODUCT_ID
  if (!token || !productId) return back('unavailable')

  // Who is buying? Identify by the authenticated account, not the billing email.
  let userId = ''
  let userEmail = ''
  let alreadyPro = false
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      userEmail = (user.email ?? '').toLowerCase().trim()
      // Already own lifetime Pro? Don't let them pay a second time.
      const { data: profile } = await supabase
        .from('users_profile')
        .select('lifetime_access')
        .eq('id', user.id)
        .single()
      alreadyPro = Boolean(profile?.lifetime_access)
    }
  } catch {
    /* treated as logged-out below */
  }

  // Not signed in → log in first, then return straight to checkout.
  if (!userId) {
    return NextResponse.redirect(
      `${APP_URL}/login?redirect=${encodeURIComponent('/api/polar/checkout')}`,
      302,
    )
  }

  // Already Pro → skip checkout entirely so we never double-charge an owner.
  if (alreadyPro) {
    return NextResponse.redirect(`${APP_URL}/dashboard?already=pro`, 302)
  }

  try {
    const res = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [productId],
        success_url: `${APP_URL}/api/polar/success?checkout_id={CHECKOUT_ID}`,
        customer_external_id: userId,
        ...(userEmail ? { customer_email: userEmail } : {}),
        metadata: { user_id: userId },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.url) {
      console.error('Polar checkout create failed:', res.status, JSON.stringify(data))
      return back('error')
    }
    return NextResponse.redirect(data.url, 302)
  } catch (err) {
    console.error('Polar checkout route error:', err)
    return back('error')
  }
}
