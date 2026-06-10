// Server-side checkout redirect: creates a Polar checkout session and 302s the
// browser straight to Polar's hosted checkout. This is a TOP-LEVEL navigation
// (a plain <a href>), so there is NO client-side fetch, NO CORS, and NO iframe
// embed_origin to get wrong — it works the same from any host/origin.
//
// Needs: POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID on the server.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL } from '@/lib/site-config'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

const back = (q: string) => NextResponse.redirect(`${APP_URL}/pricing.html?checkout=${q}`, 302)

export async function GET(_request: NextRequest) {
  const token = process.env.POLAR_ACCESS_TOKEN
  const productId = process.env.POLAR_PRODUCT_ID
  if (!token || !productId) return back('unavailable')

  try {
    const res = await fetch('https://api.polar.sh/v1/checkouts/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: [productId],
        success_url: `${APP_URL}/login?purchased=1`,
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
