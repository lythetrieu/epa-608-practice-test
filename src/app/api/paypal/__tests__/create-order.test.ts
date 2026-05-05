import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const TOKEN_RESP = { json: { access_token: 'tok' }, ok: true }

function mockFetch(...responses: { json: object; ok?: boolean }[]) {
  let i = 0
  vi.spyOn(global, 'fetch').mockImplementation(async () => {
    const r = responses[Math.min(i++, responses.length - 1)]
    return { ok: r.ok ?? true, json: async () => r.json } as Response
  })
}

function req(body?: object) {
  return new NextRequest('https://test.com/api/paypal/create-order', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/paypal/create-order', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    ;({ POST } = await import('../create-order/route'))
    process.env.PAYPAL_CLIENT_ID = 'client-id'
    process.env.PAYPAL_SECRET = 'secret'
    process.env.DISCOUNT_CODES = 'HALF50:50,QUARTER25:25,SMALL10:10'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('creates order at base price $14.99 (no discount)', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-123' } })
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orderID).toBe('PAY-123')
    expect(body.finalPrice).toBe(14.99)
  })

  it('creates order with no body (no discount)', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-456' } })
    const res = await POST(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.finalPrice).toBe(14.99)
  })

  it('applies 50% discount → $7.50', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-HALF' } })
    const res = await POST(req({ discountCode: 'HALF50' }))
    const body = await res.json()
    expect(body.finalPrice).toBe(7.5)
    // Verify the amount sent to PayPal matches
    const paypalCall = vi.mocked(global.fetch).mock.calls[1]
    const paypalBody = JSON.parse(paypalCall[1]!.body as string)
    expect(paypalBody.purchase_units[0].amount.value).toBe('7.50')
  })

  it('applies 25% discount → $11.24', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-Q' } })
    const res = await POST(req({ discountCode: 'QUARTER25' }))
    const body = await res.json()
    expect(body.finalPrice).toBe(11.24)
  })

  it('unknown discount code → base price', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-BASE' } })
    const res = await POST(req({ discountCode: 'FAKECODEXYZ' }))
    const body = await res.json()
    expect(body.finalPrice).toBe(14.99)
  })

  it('discount code is case-insensitive', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-CASE' } })
    const res = await POST(req({ discountCode: 'half50' }))
    const body = await res.json()
    expect(body.finalPrice).toBe(7.5)
  })

  it('discount cannot go below $1.00 (safety floor)', async () => {
    process.env.DISCOUNT_CODES = 'CRAZY:99'
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-MIN' } })
    const res = await POST(req({ discountCode: 'CRAZY' }))
    const body = await res.json()
    expect(body.finalPrice).toBe(1.0)
  })

  it('order body includes digital goods category and NO_SHIPPING', async () => {
    mockFetch(TOKEN_RESP, { json: { id: 'PAY-DIGITAL' } })
    await POST(req({}))
    const paypalCall = vi.mocked(global.fetch).mock.calls[1]
    const paypalBody = JSON.parse(paypalCall[1]!.body as string)
    expect(paypalBody.application_context.shipping_preference).toBe('NO_SHIPPING')
    expect(paypalBody.purchase_units[0].items[0].category).toBe('DIGITAL_GOODS')
  })

  it('500 — PayPal API fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('timeout'))
    const res = await POST(req({}))
    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({ error: 'Failed to create order' })
  })
})
