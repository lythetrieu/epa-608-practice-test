import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function req(body: object) {
  return new NextRequest('https://test.com/api/paypal/validate-discount', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/paypal/validate-discount', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.resetModules()
    process.env.DISCOUNT_CODES = 'SAVE50:50,VIP20:20,SMALL5:5'
    ;({ POST } = await import('../validate-discount/route'))
  })

  it('valid code → valid: true with discount and finalPrice', async () => {
    const res = await POST(req({ code: 'SAVE50' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.discount).toBe(50)
    expect(body.finalPrice).toBe(7.5)
    expect(body.savings).toBe(7.49)
  })

  it('valid code lowercase → normalized and accepted', async () => {
    const res = await POST(req({ code: 'vip20' }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.discount).toBe(20)
  })

  it('invalid code → valid: false', async () => {
    const res = await POST(req({ code: 'NOTREAL' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('empty code → valid: false', async () => {
    const res = await POST(req({ code: '' }))
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('missing code field → valid: false', async () => {
    const res = await POST(req({}))
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('DISCOUNT_CODES not set → all codes invalid', async () => {
    vi.resetModules()
    delete process.env.DISCOUNT_CODES
    ;({ POST } = await import('../validate-discount/route'))
    const res = await POST(req({ code: 'SAVE50' }))
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('5% discount calculates correctly', async () => {
    const res = await POST(req({ code: 'SMALL5' }))
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.finalPrice).toBeCloseTo(14.24, 2)
  })

  it('invalid JSON body → 400', async () => {
    const r = new NextRequest('https://test.com/api/paypal/validate-discount', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(r)
    expect(res.status).toBe(400)
  })
})
