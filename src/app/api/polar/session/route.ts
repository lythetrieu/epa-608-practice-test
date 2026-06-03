// Creates a Polar Checkout Session on demand so the checkout can be embedded
// INLINE (the session URL polar.sh/checkout/... is iframe-able; the checkout
// LINK is not, because it redirects through polar.sh which sends X-Frame: DENY).
//
// Needs two env vars on the server:
//   POLAR_ACCESS_TOKEN  — Organization Access Token (Polar → Settings → API Tokens)
//   POLAR_PRODUCT_ID    — the product to sell (Polar → Products → the product's ID)
//
// embed_origin must equal the Origin of the page that embeds the iframe, so
// Polar only postMessages checkout events to us.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL, MARKETING_URL, corsHeaders } from '@/lib/site-config'

export const dynamic = 'force-dynamic'
// Edge runtime — near-zero cold start so the checkout iframe can start loading
// sooner. This route only does a fetch() to the Polar API, which is edge-safe.
export const runtime = 'edge'

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

  try {
    const res = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [productId],
        success_url: `${APP_URL}/login?purchased=1`,
        embed_origin: MARKETING_URL,
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
    return NextResponse.json({ url: data.url, id: data.id }, { headers })
  } catch (err) {
    console.error('Polar session route error:', err)
    return NextResponse.json({ error: 'network_error' }, { status: 502, headers })
  }
}
