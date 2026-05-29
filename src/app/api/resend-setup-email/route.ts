import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resendEmailRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'
import { generateTempPassword } from '@/lib/auth/temp-password'

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
      subject: '🎉 Your EPA 608 Pro account — log in details inside',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b;">
          <div style="background:#003087;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
            <h1 style="color:#fff;font-size:22px;margin:0 0 6px;">🎉 Welcome to EPA 608 Pro!</h1>
            <p style="color:#93c5fd;font-size:14px;margin:0;">Your account is ready.</p>
          </div>

          <p style="font-size:15px;color:#374151;line-height:1.6;">
            Log in with the details below, then change your password anytime under <strong>Settings → Change Password</strong>.
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
