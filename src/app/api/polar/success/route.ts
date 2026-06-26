// Reconcile-on-return: Polar redirects here after a successful checkout (the
// success_url carries Polar's {CHECKOUT_ID}). We fetch the checkout from Polar
// and grant Pro SYNCHRONOUSLY — so provisioning does NOT depend on the async
// webhook firing. If the webhook (which can fail on a secret/subscription
// mismatch) never runs, the buyer still gets Pro the moment they land here.
//
// AUTH-FIRST: prefer the buyer's Supabase id (customer_external_id / metadata),
// passed in by the authenticated checkout, so Pro lands on the right account
// regardless of billing email; fall back to email for legacy/anonymous orders.
//
// grantProAccess*() is idempotent, so the webhook and this route both running is
// safe. Defensive: on any uncertainty we just redirect — never worse than before.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL } from '@/lib/site-config'
import { grantProAccess, grantProAccessByUserId } from '@/lib/fulfillment'

export const dynamic = 'force-dynamic'
// Node runtime: grant*() uses the Supabase admin client (not edge-safe).
export const runtime = 'nodejs'

type Checkout = {
  status?: unknown
  customer_email?: unknown
  customer?: { email?: unknown; external_id?: unknown } | null
  customer_external_id?: unknown
  metadata?: { user_id?: unknown } | null
}

export async function GET(request: NextRequest) {
  const checkoutId = (new URL(request.url).searchParams.get('checkout_id') ?? '').trim()
  const done = NextResponse.redirect(`${APP_URL}/login?purchased=1`, 302)

  const token = process.env.POLAR_ACCESS_TOKEN
  if (!checkoutId || !token) {
    if (!checkoutId) console.error('Polar success: missing checkout_id')
    return done
  }

  try {
    const res = await fetch(`https://api.polar.sh/v1/checkouts/${encodeURIComponent(checkoutId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const co = (await res.json().catch(() => ({}))) as Checkout

    const status = String(co.status ?? '')
    const paid = res.ok && (status === 'succeeded' || status === 'confirmed')
    const userId = String(co.customer_external_id ?? co.customer?.external_id ?? co.metadata?.user_id ?? '').trim()
    const email = String(co.customer_email ?? co.customer?.email ?? '').toLowerCase().trim()

    if (paid && (userId || email)) {
      const result = userId
        ? await grantProAccessByUserId(userId, `polar_checkout_${checkoutId}`)
        : await grantProAccess(email, `polar_checkout_${checkoutId}`)
      if (!result.ok) console.error('Polar success reconcile FAILED:', checkoutId, result.error)
      else console.log('Polar success reconcile ok:', checkoutId, result.status, userId ? '(by id)' : '(by email)')
    } else {
      console.error('Polar success reconcile skipped — not paid or no identity:', checkoutId, 'status=', status)
    }
  } catch (err) {
    console.error('Polar success reconcile error:', checkoutId, err)
  }

  return done
}
