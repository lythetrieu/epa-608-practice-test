// Did everyone who paid actually get what they bought?
//
// Our own tables cannot answer that. When fulfilment fails there is no row to
// find — the customer paid Polar, we never heard about it, and the database
// looks exactly as it would if they had never come. The only authority on who
// paid is Polar, so the check has to start there and work back.
//
// This ran for the first time after Polar disabled the EPA 608 webhook: every
// order.paid delivery since the hosts split had answered 301, ten retries each,
// and nobody had a way to tell whether a buyer had slipped through.

import { createAdminClient } from '@/lib/supabase/server'

type PolarCustomer = { id?: string; email?: string; name?: string; external_id?: string }
type PolarOrder = {
  id: string
  created_at: string
  status: string
  paid?: boolean
  total_amount?: number
  currency?: string
  customer?: PolarCustomer
  product?: { id?: string; name?: string }
}

export type Row = {
  orderId: string
  at: string
  amountCents: number
  product: string
  email: string
  /**
   * 'ok' paid and has Pro · 'missing' paid, has an account, no Pro ·
   * 'no_account' paid, never signed up · 'other_product' belongs to a sibling
   * product on the same Polar account, so this database cannot judge it.
   */
  verdict: 'ok' | 'missing' | 'no_account' | 'other_product'
  userId: string | null
}

/** Somebody who reached the payment form. What happened next is the question. */
export type Attempt = {
  id: string
  at: string
  status: string
  email: string
  amountCents: number
  origin: string
  userId: string | null
}

export type Reconciliation =
  | { ok: false; error: string }
  | {
      ok: true
      rows: Row[]
      counts: { paidOrders: number; granted: number; missing: number; noAccount: number; freeOrders: number; otherProduct: number }
      revenueCents: number
      proInDb: number
      /** Checkout attempts by status — `failed` is the one that means lost money. */
      checkoutCounts: Record<string, number>
      failed: Attempt[]
      checkoutTotal: number
    }

/** Polar pages at 100; ask for every page rather than trusting the first. */
async function fetchAll<T>(token: string, path: string): Promise<T[]> {
  const out: T[] = []
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(`https://api.polar.sh/v1/${path}/?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`Polar /${path} ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as { items?: T[]; pagination?: { max_page?: number } }
    out.push(...(data.items ?? []))
    if (page >= (data.pagination?.max_page ?? 1)) break
  }
  return out
}

type PolarCheckout = {
  id: string
  status: string
  created_at: string
  customer_email?: string | null
  external_customer_id?: string | null
  total_amount?: number
  embed_origin?: string | null
  product_id?: string
}

export async function reconcile(): Promise<Reconciliation> {
  const token = process.env.POLAR_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'POLAR_ACCESS_TOKEN chưa được đặt trên server.' }

  let orders: PolarOrder[]
  let checkouts: PolarCheckout[]
  try {
    ;[orders, checkouts] = await Promise.all([
      fetchAll<PolarOrder>(token, 'orders'),
      fetchAll<PolarCheckout>(token, 'checkouts'),
    ])
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) }
  }

  const admin = createAdminClient()
  const { data: profiles } = await admin.from('users_profile').select('id, email, lifetime_access')
  const byEmail = new Map<string, { id: string; lifetime_access: boolean }>()
  const byId = new Map<string, { id: string; lifetime_access: boolean }>()
  for (const p of profiles ?? []) {
    const rec = { id: p.id, lifetime_access: Boolean(p.lifetime_access) }
    if (p.email) byEmail.set(String(p.email).toLowerCase().trim(), rec)
    byId.set(p.id, rec)
  }

  // One Polar account serves three products. Orders for the siblings must not
  // be measured against THIS database — their buyers legitimately have no row
  // here, and counting them as unfulfilled would invent a crisis every time
  // another product made a sale.
  const OUR_PRODUCT = process.env.POLAR_PRODUCT_ID ?? ''
  const isOurs = (pid?: string) => !OUR_PRODUCT || !pid || pid === OUR_PRODUCT

  // Checkout attempts are organisation-wide too, and the first version of this
  // file counted every one of them. That described this product's funnel with
  // its siblings' abandoned carts — numbers that look precise and belong to
  // somebody else.
  checkouts = checkouts.filter((c) => isOurs(c.product_id))

  const paid = orders.filter((o) => o.paid || o.status === 'paid')
  const rows: Row[] = []
  let revenueCents = 0
  let freeOrders = 0

  for (const o of paid) {
    const amount = o.total_amount ?? 0
    revenueCents += amount
    if (amount === 0) freeOrders++

    const email = String(o.customer?.email ?? '').toLowerCase().trim()
    // Match on external_id first: checkout sets customer_external_id to the
    // Supabase user id, so it survives a buyer paying from a different address
    // than the one they registered with — which email matching would miss.
    const profile =
      (o.customer?.external_id ? byId.get(o.customer.external_id) : undefined) ?? byEmail.get(email)

    rows.push({
      orderId: o.id,
      at: o.created_at,
      amountCents: amount,
      product: o.product?.name ?? '—',
      email,
      userId: profile?.id ?? null,
      verdict: !isOurs(o.product?.id)
        ? 'other_product'
        : !profile
          ? 'no_account'
          : profile.lifetime_access
            ? 'ok'
            : 'missing',
    })
  }

  rows.sort((a, b) => b.at.localeCompare(a.at))

  const proInDb = (profiles ?? []).filter(
    (p) => p.lifetime_access && !String(p.email ?? '').endsWith('@epa608-test.local'),
  ).length

  // Every checkout that got as far as the payment form. `expired` is somebody
  // who opened it and wandered off — normal, and the bulk of them. `failed` is
  // different: they tried to pay and it did not go through, which is a lost
  // sale and sometimes a bug on our side rather than a declined card.
  const checkoutCounts: Record<string, number> = {}
  for (const c of checkouts) checkoutCounts[c.status] = (checkoutCounts[c.status] ?? 0) + 1

  const failed: Attempt[] = checkouts
    .filter((c) => c.status === 'failed')
    .map((c) => {
      const email = String(c.customer_email ?? '').toLowerCase().trim()
      const prof = (c.external_customer_id ? byId.get(c.external_customer_id) : undefined) ?? byEmail.get(email)
      return {
        id: c.id,
        at: c.created_at,
        status: c.status,
        email,
        amountCents: c.total_amount ?? 0,
        origin: c.embed_origin ?? '',
        userId: prof?.id ?? null,
      }
    })
    .sort((a, b) => b.at.localeCompare(a.at))

  return {
    ok: true,
    checkoutCounts,
    failed,
    checkoutTotal: checkouts.length,
    rows,
    counts: {
      // Headline counts describe THIS product only; sibling orders are listed
      // but never scored.
      paidOrders: rows.filter((r) => r.verdict !== 'other_product').length,
      granted: rows.filter((r) => r.verdict === 'ok').length,
      missing: rows.filter((r) => r.verdict === 'missing').length,
      noAccount: rows.filter((r) => r.verdict === 'no_account').length,
      freeOrders,
      otherProduct: rows.filter((r) => r.verdict === 'other_product').length,
    },
    revenueCents,
    proInDb,
  }
}
