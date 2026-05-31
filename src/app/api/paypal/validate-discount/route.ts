import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/site-config'

const BASE_PRICE = 14.99

// Codes stored in env: "CODE1:50,CODE2:25,CODE3:10"
// Each entry = code:percent_off
function parseCodes(): Record<string, number> {
  const raw = process.env.DISCOUNT_CODES || ''
  const result: Record<string, number> = {}
  for (const entry of raw.split(',')) {
    const [code, pct] = entry.trim().split(':')
    if (code && pct) result[code.toUpperCase()] = parseFloat(pct)
  }
  return result
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: { ...corsHeaders(request), 'Access-Control-Allow-Headers': 'Content-Type' },
  })
}

export async function POST(request: NextRequest) {
  let body: { code?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ valid: false, message: 'Invalid request' }, { status: 400, headers: corsHeaders(request) })
  }

  const code = (body.code || '').trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ valid: false, message: 'Enter a discount code' }, { headers: corsHeaders(request) })
  }

  const codes = parseCodes()
  const discount = codes[code]

  if (discount === undefined) {
    return NextResponse.json({ valid: false, message: 'Invalid code' }, { headers: corsHeaders(request) })
  }

  const finalPrice = Math.max(1.00, parseFloat((BASE_PRICE * (1 - discount / 100)).toFixed(2)))

  return NextResponse.json({
    valid: true,
    code,
    discount,
    originalPrice: BASE_PRICE,
    finalPrice,
    savings: parseFloat((BASE_PRICE - finalPrice).toFixed(2)),
    message: `${discount}% off applied!`,
  }, { headers: corsHeaders(request) })
}
