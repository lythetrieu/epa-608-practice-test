import { NextRequest, NextResponse } from 'next/server'

const PAYPAL_API = 'https://api-m.paypal.com'
const BASE_PRICE = 14.99

const HEADERS = {
  'Access-Control-Allow-Origin': 'https://epa608practicetest.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { ...HEADERS, 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!
  const secret = process.env.PAYPAL_SECRET!
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${secret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

function parseCodes(): Record<string, number> {
  const raw = process.env.DISCOUNT_CODES || ''
  const result: Record<string, number> = {}
  for (const entry of raw.split(',')) {
    const [code, pct] = entry.trim().split(':')
    if (code && pct) result[code.toUpperCase()] = parseFloat(pct)
  }
  return result
}

export async function POST(request: NextRequest) {
  let discountCode = ''
  try {
    const body = await request.json()
    discountCode = (body.discountCode || '').trim().toUpperCase()
  } catch { /* no body = no discount */ }

  // Compute final price
  let finalPrice = BASE_PRICE
  if (discountCode) {
    const codes = parseCodes()
    const pct = codes[discountCode]
    if (pct !== undefined) {
      finalPrice = Math.max(1.00, parseFloat((BASE_PRICE * (1 - pct / 100)).toFixed(2)))
    }
  }

  try {
    const token = await getAccessToken()
    const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: finalPrice.toFixed(2) },
          description: 'EPA 608 Pro Lifetime Access',
        }],
      }),
    })
    const order = await res.json()
    return NextResponse.json({ orderID: order.id, finalPrice }, { headers: HEADERS })
  } catch (err) {
    console.error('Create order error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500, headers: HEADERS })
  }
}
