import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { captureRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'
import { generateTempPassword } from '@/lib/auth/temp-password'

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

async function sendProUpgradeEmail(resendKey: string, email: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EPA 608 Practice Test <support@epa608practicetest.net>',
      to: [email],
      subject: '🎉 Your EPA 608 Pro upgrade is active',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b;">
          <div style="background:#003087;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 6px;">🎉 Pro upgrade confirmed!</h1>
            <p style="color:#93c5fd;font-size:14px;margin:0;">Your existing account is now Pro.</p>
          </div>

          <p style="font-size:15px;color:#374151;line-height:1.6;">
            Your account at <strong>${email}</strong> has been upgraded to Pro. Log in with your existing password to access all Pro features:
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="https://epa608practicetest.net/login"
               style="display:inline-block;background:#e85d04;color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:700;">
              Log In to Access Pro →
            </a>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="font-size:13px;color:#15803d;font-weight:600;margin:0 0 8px;">✓ What's now unlocked in your account:</p>
            <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
              <li>866 practice questions (all 4 sections)</li>
              <li>AI Tutor — 1,000 questions/day</li>
              <li>Weak Spot Drill + Progress Analytics</li>
              <li>All future features, forever</li>
            </ul>
          </div>

          <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            Questions? <a href="mailto:support@epa608practicetest.net" style="color:#003087;">support@epa608practicetest.net</a>
          </p>
        </div>
      `,
    }),
  })
}

async function sendProWelcomeEmail(resendKey: string, email: string, tempPassword: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EPA 608 Practice Test <support@epa608practicetest.net>',
      to: [email],
      subject: '🎉 Your EPA 608 Pro account is ready — log in details inside',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b;">
          <div style="background:#003087;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 6px;">🎉 Welcome to EPA 608 Pro!</h1>
            <p style="color:#93c5fd;font-size:14px;margin:0;">Your payment was confirmed. Your account is ready.</p>
          </div>

          <p style="font-size:15px;color:#374151;line-height:1.6;">
            We created your Pro account. Log in with the details below, then change your password anytime under <strong>Settings → Change Password</strong>.
          </p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:20px 0;">
            <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Email</p>
            <p style="font-size:15px;color:#1e293b;font-weight:600;margin:0 0 14px;">${email}</p>
            <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Temporary password</p>
            <p style="font-size:18px;color:#1e293b;font-weight:700;letter-spacing:0.5px;font-family:'SFMono-Regular',Consolas,monospace;margin:0;">${tempPassword}</p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="https://epa608practicetest.net/login"
               style="display:inline-block;background:#e85d04;color:#fff;text-decoration:none;padding:15px 36px;border-radius:10px;font-size:16px;font-weight:700;">
              Log In to Access Pro →
            </a>
          </div>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="font-size:13px;color:#15803d;font-weight:600;margin:0 0 8px;">✓ What's included in your Pro account:</p>
            <ul style="font-size:13px;color:#374151;margin:0;padding-left:20px;line-height:1.8;">
              <li>866 practice questions (all 4 sections)</li>
              <li>AI Tutor — 1,000 questions/day</li>
              <li>Weak Spot Drill + Progress Analytics</li>
              <li>All future features, forever</li>
            </ul>
          </div>

          <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
            For your security, please change this temporary password after logging in. Questions?
            <a href="mailto:support@epa608practicetest.net" style="color:#003087;">support@epa608practicetest.net</a>
          </p>
        </div>
      `,
    }),
  })
  // Non-fatal here (we must never fail the purchase after charging), but log
  // a non-2xx so a failed credential email is visible/alertable, not silent.
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('Pro welcome email failed:', res.status, detail)
  }
}

export async function POST(request: NextRequest) {
  const { success, reset } = await captureRateLimit.limit(getIdentifier(request))
  if (!success) return rateLimitResponse(reset)

  let body: { orderID?: string; email?: string; discountCode?: string }
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

    // Email: validate client-supplied email against PayPal's verified payer email
    const paypalPayerEmail = (order.payer?.email_address || '').toLowerCase().trim()
    const clientEmail = (email || '').toLowerCase().trim()
    if (clientEmail && paypalPayerEmail && clientEmail !== paypalPayerEmail) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 400, headers: HEADERS })
    }
    const payerEmail = paypalPayerEmail || clientEmail
    const amount = order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value

    if (!amount || parseFloat(amount) < 1.00) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400, headers: HEADERS })
    }

    if (!payerEmail) {
      return NextResponse.json({ error: 'No email found' }, { status: 400, headers: HEADERS })
    }

    const admin = createAdminClient()

    // 1. Check if user already has an account
    const { data: profile } = await admin
      .from('users_profile')
      .select('id, lifetime_access')
      .eq('email', payerEmail)
      .single()

    if (profile) {
      // Already Pro — idempotent return (prevents duplicate upgrade + email on replay)
      if (profile.lifetime_access) {
        return NextResponse.json({ ok: true, email: payerEmail, newAccount: false }, { headers: HEADERS })
      }

      // Existing user → upgrade immediately
      const { error: upgradeError } = await admin.from('users_profile').update({
        tier: 'starter',
        lifetime_access: true,
      }).eq('id', profile.id)

      if (upgradeError) {
        console.error('Upgrade failed for existing user:', upgradeError)
        return NextResponse.json({ error: 'Upgrade failed' }, { status: 500, headers: HEADERS })
      }

      // Clean up pending_upgrades
      await admin.from('pending_upgrades').delete().eq('email', payerEmail)

      // Send Pro upgrade confirmation email (existing user — they already have a password)
      const { data: configRow } = await admin
        .from('app_config')
        .select('value')
        .eq('key', 'resend_api_key')
        .single()
      const resendKey = configRow?.value
      if (resendKey) {
        await sendProUpgradeEmail(resendKey, payerEmail).catch(err =>
          console.error('Resend email failed (existing user):', err)
        )
      }

      return NextResponse.json({ ok: true, email: payerEmail, newAccount: false }, { headers: HEADERS })
    }

    // 2. Guard: reject if this orderID was already used for a different email
    const { data: existingOrder } = await admin
      .from('pending_upgrades')
      .select('email')
      .eq('ls_order_id', orderID)
      .maybeSingle()

    if (existingOrder && existingOrder.email.toLowerCase().trim() !== payerEmail) {
      return NextResponse.json({ error: 'Order already used' }, { status: 409, headers: HEADERS })
    }

    // Save purchase record (in case anything below fails)
    const { error: upsertError } = await admin.from('pending_upgrades').upsert({
      email: payerEmail,
      tier: 'starter',
      ls_order_id: orderID,
    }, { onConflict: 'email' })
    if (upsertError) {
      console.error('pending_upgrades upsert failed:', upsertError)
    }

    // 3. No account → create one server-side WITH a temporary password.
    // We email the temp password and the customer changes it in Settings.
    // This avoids the fragile "email a recovery link to set a password" flow
    // (token_hash/PKCE/email-prefetch) that left paying customers stranded on
    // "Auth session missing". Login + Settings change-password are both proven.
    // Triggers fire automatically:
    //   handle_new_user       → creates users_profile row
    //   apply_pending_upgrade → applies Pro tier from pending_upgrades
    const tempPassword = generateTempPassword()
    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: payerEmail,
      password: tempPassword,
      email_confirm: true, // skip email verification step
      user_metadata: { source: 'checkout', order_id: orderID },
    })

    if (createError || !newUser?.user) {
      // Account creation failed — pending_upgrades is saved, they can signup manually
      console.error('createUser error:', createError)
      return NextResponse.json({ ok: true, email: payerEmail, newAccount: false, setupFailed: true }, { headers: HEADERS })
    }

    // 4. Email the Pro welcome with the temporary password.
    const { data: configRow2 } = await admin
      .from('app_config')
      .select('value')
      .eq('key', 'resend_api_key')
      .single()
    const resendKey2 = configRow2?.value
    if (resendKey2) {
      await sendProWelcomeEmail(resendKey2, payerEmail, tempPassword).catch(err =>
        console.error('Resend email failed:', err)
      )
    }

    return NextResponse.json({ ok: true, email: payerEmail, newAccount: true }, { headers: HEADERS })

  } catch (err) {
    console.error('PayPal capture error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500, headers: HEADERS })
  }
}
