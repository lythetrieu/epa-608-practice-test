import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { captureRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'
import { generateTempPassword } from '@/lib/auth/temp-password'
import { APP_URL } from '@/lib/site-config'

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
      subject: "You're on EPA 608 Pro",
      text: `EPA 608 Practice Test\n\nYou're on EPA 608 Pro\n\nYour account ${email} now has Pro.\n\nLog in:\n${APP_URL}/login\n\nSign in with your existing password.\n\n—\nEPA 608 Practice Test · epa608practicetest.net`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>You're on EPA 608 Pro</title></head>
<body style="margin:0;padding:0;background:#f7f8fa;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f8fa;opacity:0;">Your account now has Pro access.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="font-size:16px;font-weight:600;color:#1f2a44;padding-bottom:28px;"><span style="color:#003087;">&#9889;</span> EPA 608 Practice Test</div>
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">You're on EPA 608 Pro</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Your account ${email} now has Pro.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="border-radius:6px;background:#c2691c;"><a href="${APP_URL}/login" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Log in</a></td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">Sign in with your existing password.</p>
<div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px;font-size:13px;line-height:1.5;color:#64748b;">EPA 608 Practice Test &middot; epa608practicetest.net<br><a href="${APP_URL}/settings" style="color:#64748b;text-decoration:underline;">Manage email preferences</a></div>
</td></tr></table>
</td></tr></table>
</body></html>`,
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
      subject: 'Welcome to EPA 608 Pro',
      text: `EPA 608 Practice Test\n\nWelcome to EPA 608 Pro\n\nYour account is ready.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\nLog in: ${APP_URL}/login\n\nChange your password in Settings after signing in.\n\n—\nEPA 608 Practice Test · epa608practicetest.net`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Welcome to EPA 608 Pro</title></head>
<body style="margin:0;padding:0;background:#f7f8fa;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f8fa;opacity:0;">Your account is ready. Here are your sign-in details.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="font-size:16px;font-weight:600;color:#1f2a44;padding-bottom:28px;"><span style="color:#003087;">&#9889;</span> EPA 608 Practice Test</div>
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">Welcome to EPA 608 Pro</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Your account is ready.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f7f8fa;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="font-size:12px;color:#64748b;padding-bottom:2px;">Email</div>
<div style="font-size:14px;font-weight:600;color:#1f2a44;padding-bottom:14px;">${email}</div>
<div style="font-size:12px;color:#64748b;padding-bottom:2px;">Temporary password</div>
<div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;font-weight:600;color:#1f2a44;">${tempPassword}</div>
</td></tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="border-radius:6px;background:#c2691c;"><a href="${APP_URL}/login" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Log in</a></td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">Change your password in Settings after signing in.</p>
<div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px;font-size:13px;line-height:1.5;color:#64748b;">EPA 608 Practice Test &middot; epa608practicetest.net<br><a href="${APP_URL}/settings" style="color:#64748b;text-decoration:underline;">Manage email preferences</a></div>
</td></tr></table>
</td></tr></table>
</body></html>`,
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
