// Reconcile-on-return: Polar redirects here after a successful checkout (the
// success_url carries Polar's {CHECKOUT_ID}). We fetch the checkout from Polar
// and grant Pro SYNCHRONOUSLY — so provisioning does NOT depend on the async
// webhook firing. If the webhook (which can fail on a secret/subscription
// mismatch) never runs, the buyer still gets Pro the moment they land here.
//
// grantProAccess() is idempotent, so the webhook and this route both running is
// safe (the second one no-ops). Defensive by design: on any uncertainty we just
// redirect — the webhook remains the secondary path, so we are never worse off.
//
// Needs: POLAR_ACCESS_TOKEN on the server.

import { NextRequest, NextResponse } from 'next/server'
import { APP_URL } from '@/lib/site-config'
import { grantProAccess } from '@/lib/fulfillment'

export const dynamic = 'force-dynamic'
// Node runtime: grantProAccess uses the Supabase admin client + auth admin
// (createUser / temp password), which is not edge-safe.
export const runtime = 'nodejs'

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
    const co = await res.json().catch(() => ({} as Record<string, unknown>))

    // Polar checkout is paid when status is 'succeeded' (also accept 'confirmed').
    const status = String((co as { status?: unknown }).status ?? '')
    const paid = res.ok && (status === 'succeeded' || status === 'confirmed')
    const email = String(
      (co as { customer_email?: unknown }).customer_email ??
        (co as { customer?: { email?: unknown } }).customer?.email ??
        '',
    )
      .toLowerCase()
      .trim()

    if (paid && email) {
      const result = await grantProAccess(email, `polar_checkout_${checkoutId}`)
      if (!result.ok) console.error('Polar success reconcile FAILED:', checkoutId, result.error)
      else console.log('Polar success reconcile ok:', checkoutId, result.status, result.email)
    } else {
      console.error('Polar success reconcile skipped — not paid or no email:', checkoutId, 'status=', status)
    }
  } catch (err) {
    console.error('Polar success reconcile error:', checkoutId, err)
  }

  return done
}
