// Polar (Merchant of Record) webhook. Polar calls this on payment events; the
// adapter verifies the signature against POLAR_WEBHOOK_SECRET. On a paid order
// we grant the buyer lifetime Pro.
//
// AUTH-FIRST: when the checkout was started by a logged-in user we passed their
// Supabase id as customer_external_id + metadata.user_id, so we grant Pro to
// that exact account (billing email is irrelevant). We fall back to matching by
// email only for legacy/anonymous orders.
//
// Idempotent: grant*() no-ops a buyer who already has Pro, so Polar's
// at-least-once delivery / retries — and the success-page reconcile — are safe.

import { Webhooks } from '@polar-sh/nextjs'
import { grantProAccess, grantProAccessByUserId } from '@/lib/fulfillment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PolarOrderish = {
  id?: string
  customer?: { email?: string | null; external_id?: string | null } | null
  customer_email?: string | null
  customerEmail?: string | null
  customer_external_id?: string | null
  metadata?: { user_id?: string | null } | null
}

function extractEmail(order: PolarOrderish): string {
  return (order.customer?.email ?? order.customer_email ?? order.customerEmail ?? '') || ''
}

function extractUserId(order: PolarOrderish): string {
  return (
    (order.customer_external_id ?? order.customer?.external_id ?? order.metadata?.user_id ?? '') || ''
  )
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? '',
  onOrderPaid: async (payload) => {
    const order = payload.data as PolarOrderish
    const orderRef = `polar_${order.id ?? 'unknown'}`
    const userId = extractUserId(order)
    const email = extractEmail(order)

    const result = userId
      ? await grantProAccessByUserId(userId, orderRef)
      : email
        ? await grantProAccess(email, orderRef)
        : null

    if (!result) {
      console.error('Polar order.paid had no user id and no customer email:', orderRef)
      return
    }
    if (!result.ok) {
      console.error('Polar fulfillment FAILED:', orderRef, result.error, userId ? `userId=${userId}` : '')
    } else if (result.status === 'created_setup_failed') {
      console.error('Polar fulfillment NEEDS ATTENTION (account not created):', orderRef, result.email)
    } else {
      console.log('Polar fulfillment ok:', orderRef, result.status, result.email, userId ? '(by id)' : '(by email)')
    }
  },
})
