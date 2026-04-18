import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ''

function verifySignature(rawBody: string, signature: string): boolean {
  if (!SECRET) return false
  const hmac = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName = payload?.meta?.event_name
  const attrs = payload?.data?.attributes

  // Only handle completed orders
  if (eventName !== 'order_created' || attrs?.status !== 'paid') {
    return NextResponse.json({ received: true })
  }

  const email = attrs?.user_email as string | undefined
  if (!email) {
    return NextResponse.json({ error: 'No email in payload' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Find user by email
  const { data: { users }, error } = await admin.auth.admin.listUsers()
  if (error) {
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    // Store pending upgrade — applied when user signs up with this email
    await admin.from('pending_upgrades').upsert({
      email: email.toLowerCase(),
      tier: 'starter',
      ls_order_id: String(payload?.data?.id ?? ''),
      created_at: new Date().toISOString(),
    })
    return NextResponse.json({ received: true, status: 'pending_signup' })
  }

  // Apply Pro tier
  await admin.from('users_profile').update({
    tier: 'starter',
    lifetime_access: true,
  }).eq('id', user.id)

  return NextResponse.json({ received: true, status: 'upgraded' })
}
