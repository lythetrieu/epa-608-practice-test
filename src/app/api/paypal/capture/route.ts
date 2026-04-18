import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

const PAYPAL_API = 'https://api-m.paypal.com'

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

async function sendProWelcomeEmail(resendKey: string, email: string, setupLink: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EPA 608 Practice Test <support@epa608practicetest.net>',
      to: [email],
      subject: '🎉 Your EPA 608 Pro account is ready — click to access',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b;">
          <div style="background:#003087;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 6px;">🎉 Welcome to EPA 608 Pro!</h1>
            <p style="color:#93c5fd;font-size:14px;margin:0;">Your payment was confirmed. Your account is ready.</p>
          </div>

          <p style="font-size:15px;color:#374151;line-height:1.6;">
            We created your Pro account at <strong>${email}</strong>. Click the button below to set your password and go straight to your dashboard:
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${setupLink}"
               style="display:inline-block;background:#e85d04;color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:700;">
              Set Password &amp; Access Pro →
            </a>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="font-size:13px;color:#15803d;font-weight:600;margin:0 0 8px;">✓ What's included in your Pro account:</p>
            <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
              <li>530+ ESCO & SkillCat exam questions</li>
              <li>AI Tutor — 1,000 questions/day</li>
              <li>Weak Spot Drill + Progress Analytics</li>
              <li>All future features, forever</li>
            </ul>
          </div>

          <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            This link expires in 24 hours. Questions?
            <a href="mailto:support@epa608practicetest.net" style="color:#003087;">support@epa608practicetest.net</a>
          </p>
        </div>
      `,
    }),
  })
}

export async function POST(request: NextRequest) {
  let body: { orderID?: string; email?: string; coupon?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: HEADERS })
  }

  const { orderID, email } = body
  if (!orderID) {
    return NextResponse.json({ error: 'Missing orderID' }, { status: 400, headers: HEADERS })
  }

  try {
    const token = await getAccessToken()
    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const order = await orderRes.json()

    if (order.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400, headers: HEADERS })
    }

    // Email: prefer form input, fallback to PayPal payer email
    const payerEmail = (email || order.payer?.email_address || '').toLowerCase().trim()
    const amount = order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value

    if (!amount || parseFloat(amount) < 0.01) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: HEADERS })
    }

    if (!payerEmail) {
      return NextResponse.json({ error: 'No email found' }, { status: 400, headers: HEADERS })
    }

    const admin = createAdminClient()

    // 1. Save purchase record (in case anything below fails)
    await admin.from('pending_upgrades').upsert({
      email: payerEmail,
      tier: 'starter',
      ls_order_id: orderID,
    }, { onConflict: 'email' })

    // 2. Check if user already has an account
    const { data: profile } = await admin
      .from('users_profile')
      .select('id')
      .eq('email', payerEmail)
      .single()

    if (profile) {
      // Existing user → upgrade immediately
      await admin.from('users_profile').update({
        tier: 'starter',
        lifetime_access: true,
      }).eq('id', profile.id)

      // Clean up pending_upgrades
      await admin.from('pending_upgrades').delete().eq('email', payerEmail)

      return NextResponse.json({ ok: true, email: payerEmail, newAccount: false }, { headers: HEADERS })
    }

    // 3. No account → create one server-side
    // Triggers fire automatically:
    //   handle_new_user       → creates users_profile row
    //   apply_pending_upgrade → applies Pro tier from pending_upgrades
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: payerEmail,
      email_confirm: true, // skip email verification step
      user_metadata: { source: 'checkout', order_id: orderID },
    })

    if (createError || !newUser?.user) {
      // Account creation failed — pending_upgrades is saved, they can signup manually
      console.error('createUser error:', createError)
      return NextResponse.json({ ok: true, email: payerEmail, newAccount: false, setupFailed: true }, { headers: HEADERS })
    }

    // 4. Generate password-setup link (recovery = "set new password")
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: payerEmail,
      options: { redirectTo: 'https://epa608practicetest.net/dashboard' },
    })

    const setupLink = linkData?.properties?.action_link

    // 5. Send Pro welcome email via Resend
    if (setupLink) {
      const { data: configRow } = await admin
        .from('app_config')
        .select('value')
        .eq('key', 'resend_api_key')
        .single()

      const resendKey = configRow?.value
      if (resendKey) {
        await sendProWelcomeEmail(resendKey, payerEmail, setupLink).catch(err =>
          console.error('Resend email failed:', err)
        )
      }
    }

    return NextResponse.json({ ok: true, email: payerEmail, newAccount: true }, { headers: HEADERS })

  } catch (err) {
    console.error('PayPal capture error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500, headers: HEADERS })
  }
}
