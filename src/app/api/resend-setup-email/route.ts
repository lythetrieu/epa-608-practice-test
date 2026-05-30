import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resendEmailRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'
import { generateTempPassword } from '@/lib/auth/temp-password'
import { APP_URL } from '@/lib/site-config'

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
      subject: 'Your account access has been restored',
      text: `EPA 608 Practice Test\n\nYour access is restored\n\nDear valued customer, we recently had an issue that affected signing in to some accounts. It is now fully resolved, and we're sorry for the trouble.\n\nEmail: ${email}\nTemporary password: ${tempPassword}\nSign in: ${APP_URL}/login\n\nPlease change your password in Settings after signing in.\n\n—\nEPA 608 Practice Test · epa608practicetest.net`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Access restored</title></head>
<body style="margin:0;padding:0;background:#f7f8fa;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f8fa;opacity:0;">The sign-in issue is resolved. Here are your details to log back in.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="font-size:16px;font-weight:600;color:#1f2a44;padding-bottom:28px;"><span style="color:#003087;">&#9889;</span> EPA 608 Practice Test</div>
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">Your access is restored</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Dear valued customer, we recently had an issue that affected signing in to some accounts. It is now fully resolved, and we're sorry for the trouble.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:#f7f8fa;border:1px solid #e2e8f0;border-radius:8px;">
<tr><td style="padding:16px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="font-size:12px;color:#64748b;padding-bottom:2px;">Email</div>
<div style="font-size:14px;font-weight:600;color:#1f2a44;padding-bottom:14px;">${email}</div>
<div style="font-size:12px;color:#64748b;padding-bottom:2px;">Temporary password</div>
<div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;font-weight:600;color:#1f2a44;">${tempPassword}</div>
</td></tr></table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
<tr><td style="border-radius:6px;background:#c2691c;"><a href="${APP_URL}/login" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Log in</a></td></tr>
</table>
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">Please change your password in Settings after signing in.</p>
<div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px;font-size:13px;line-height:1.5;color:#64748b;">EPA 608 Practice Test &middot; epa608practicetest.net<br><a href="${APP_URL}/settings" style="color:#64748b;text-decoration:underline;">Manage email preferences</a></div>
</td></tr></table>
</td></tr></table>
</body></html>`,
    }),
  })
  if (!res.ok) throw new Error(`Resend API error: ${res.status}`)
}

export async function POST(request: NextRequest) {
  const { success, reset } = await resendEmailRateLimit.limit(getIdentifier(request))
  if (!success) return rateLimitResponse(reset)

  let body: { email?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: HEADERS })
  }

  const { email } = body
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Missing email' }, { status: 400, headers: HEADERS })
  }

  const payerEmail = email.toLowerCase().trim()

  try {
    const admin = createAdminClient()

    // 1. Look up user in users_profile by email (profile.id === auth.users.id)
    const { data: profile } = await admin
      .from('users_profile')
      .select('id')
      .eq('email', payerEmail)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No account found for this email' }, { status: 404, headers: HEADERS })
    }

    // 2. Anti-lockout guard: this endpoint exists only to (re)deliver the initial
    // temp password to customers who never got into their account. If the user has
    // ALREADY signed in, rotating their password from an unauthenticated request
    // would let anyone lock them out — so refuse and send them to self-service reset.
    const { data: userData } = await admin.auth.admin.getUserById(profile.id)
    if (userData?.user?.last_sign_in_at) {
      return NextResponse.json(
        { error: 'This account is already active. Use "Forgot password" on the login page to reset it.' },
        { status: 409, headers: HEADERS }
      )
    }

    // 3. Get resend key from app_config (the whole point is to send an email)
    const { data: configRow } = await admin
      .from('app_config')
      .select('value')
      .eq('key', 'resend_api_key')
      .single()
    const resendKey = configRow?.value

    if (!resendKey) {
      return NextResponse.json({ error: 'Email service unavailable' }, { status: 500, headers: HEADERS })
    }

    // 4. Send the email FIRST, then rotate the password — so a send failure never
    // invalidates the customer's current password (sendProWelcomeEmail throws on a
    // non-2xx Resend response, falling through to the 500 below with nothing changed).
    const tempPassword = generateTempPassword()
    await sendProWelcomeEmail(resendKey, payerEmail, tempPassword)

    // 5. Email delivered → now apply the temp password.
    const { error: updateError } = await admin.auth.admin.updateUserById(profile.id, {
      password: tempPassword,
      email_confirm: true,
    })
    if (updateError) {
      console.error('resend-setup-email updateUserById failed:', updateError)
      return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500, headers: HEADERS })
    }

    return NextResponse.json({ ok: true }, { headers: HEADERS })

  } catch (err) {
    console.error('resend-setup-email error:', err)
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500, headers: HEADERS })
  }
}
