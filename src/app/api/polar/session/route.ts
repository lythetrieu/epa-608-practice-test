// Creates an account-linked Polar Checkout Session for the INLINE embed.
//
// AUTH-FIRST: like /api/polar/checkout, we identify the buyer by their logged-in
// Supabase account and pass it to Polar (customer_external_id + metadata.user_id),
// so Pro is granted to the RIGHT account regardless of the billing email. The
// difference from /api/polar/checkout is the response: this route returns JSON so
// checkout.html can open the embed overlay in-page (no redirect to polar.sh).
//
// Returns one of:
//   { redirect: "<url>" }  — not signed in (→ /login) or already Pro (→ /dashboard)
//   { url, id }            — an embeddable checkout session (embed_origin set)
//   { error: ... }         — misconfig / Polar failure (checkout.html falls back
//                            to the /api/polar/checkout redirect flow)
//
// Needs on the server: POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL, corsHeaders, allowedOrigin, isAllowedOrigin } from '@/lib/site-config'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
// Node runtime: reads the Supabase session (SSR cookies) to identify the buyer.
export const runtime = 'nodejs'

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(request, 'GET, OPTIONS'), 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function GET(request: NextRequest) {
  const headers = corsHeaders(request, 'GET, OPTIONS')
  const token = process.env.POLAR_ACCESS_TOKEN
  const productId = process.env.POLAR_PRODUCT_ID

  if (!token || !productId) {
    return NextResponse.json(
      { error: 'not_configured', need: { POLAR_ACCESS_TOKEN: !!token, POLAR_PRODUCT_ID: !!productId } },
      { status: 503, headers },
    )
  }

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

  // Not signed in → tell the page to send them to log in, then back to checkout.
  if (!userId) {
    return NextResponse.json(
      { redirect: `${APP_URL}/login?redirect=${encodeURIComponent('/checkout.html')}` },
      { headers },
    )
  }
  // Already Pro → no second charge; bounce to the dashboard.
  if (alreadyPro) {
    return NextResponse.json({ redirect: `${APP_URL}/dashboard?already=pro` }, { headers })
  }

  // embed_origin must equal the Origin of the page that hosts the iframe. The page
  // passes its own origin via ?origin= (a same-origin GET sends no Origin header).
  const qOrigin = new URL(request.url).searchParams.get('origin') ?? ''
  const embedOrigin = isAllowedOrigin(qOrigin) ? qOrigin : allowedOrigin(request)

  try {
    const res = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [productId],
        success_url: `${APP_URL}/api/polar/success?checkout_id={CHECKOUT_ID}`,
        embed_origin: embedOrigin,
        customer_external_id: userId,
        ...(userEmail ? { customer_email: userEmail } : {}),
        metadata: { user_id: userId },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.url) {
      console.error('Polar create checkout failed:', res.status, JSON.stringify(data))
      return NextResponse.json(
        { error: 'session_failed', status: res.status, detail: data?.error ?? data?.detail ?? null },
        { status: 502, headers },
      )
    }
    // client_secret = the session token the embed SDK needs for INLINE mounting
    // (createInline). url/id are kept for the overlay + hosted-redirect fallbacks.
    return NextResponse.json(
      { url: data.url, id: data.id, clientSecret: data.client_secret ?? null },
      { headers },
    )
  } catch (err) {
    console.error('Polar session route error:', err)
    return NextResponse.json({ error: 'network_error' }, { status: 502, headers })
  }
}
