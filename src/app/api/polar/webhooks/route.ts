// Polar (Merchant of Record) webhook. Polar calls this on payment events; the
// adapter verifies the signature against POLAR_WEBHOOK_SECRET. On a paid order
// we grant the buyer lifetime Pro (create/upgrade their account + email them).
//
// Idempotent: grantProAccess() no-ops a buyer who already has Pro, so Polar's
// at-least-once delivery / retries are safe.

import { Webhooks } from '@polar-sh/nextjs'
import { grantProAccess } from '@/lib/fulfillment'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PolarOrderish = {
  id?: string
  customer?: { email?: string | null } | null
  customer_email?: string | null
  customerEmail?: string | null
}

function extractEmail(order: PolarOrderish): string {
  return (order.customer?.email ?? order.customer_email ?? order.customerEmail ?? '') || ''
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? '',
  onOrderPaid: async (payload) => {
    const order = payload.data as PolarOrderish
    const email = extractEmail(order)
    const orderRef = `polar_${order.id ?? 'unknown'}`

    if (!email) {
      console.error('Polar order.paid had no customer email:', orderRef)
      return
    }

    const result = await grantProAccess(email, orderRef)
    if (!result.ok) {
      console.error('Polar fulfillment FAILED:', orderRef, result.error)
    } else {
      console.log('Polar fulfillment ok:', orderRef, result.status, result.email)
    }
  },
})
