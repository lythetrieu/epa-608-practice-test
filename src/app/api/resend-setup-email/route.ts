import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { resendEmailRateLimit, getIdentifier, rateLimitResponse } from '@/lib/ratelimit'

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

async function sendProWelcomeEmail(resendKey: string, email: string, setupLink: string) {
  const res = await fetch('https://api.resend.com/emails', {
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
              <li>866 practice questions (all 4 sections)</li>
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

    // 1. Look up user in users_profile by email
    const { data: profile } = await admin
      .from('users_profile')
      .select('id')
      .eq('email', payerEmail)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No account found for this email' }, { status: 404, headers: HEADERS })
    }

    // 2. Generate a new recovery/setup link
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: payerEmail,
      options: { redirectTo: 'https://epa608practicetest.net/reset-password' },
    })
    const setupLink = linkData?.properties?.action_link

    // 3. Get resend key from app_config
    const { data: configRow } = await admin
      .from('app_config')
      .select('value')
      .eq('key', 'resend_api_key')
      .single()
    const resendKey = configRow?.value

    if (!resendKey) {
      return NextResponse.json({ error: 'Email service unavailable' }, { status: 500, headers: HEADERS })
    }

    // 4. Send welcome email
    const link = setupLink || `https://epa608practicetest.net/forgot-password?email=${encodeURIComponent(payerEmail)}`
    await sendProWelcomeEmail(resendKey, payerEmail, link)

    return NextResponse.json({ ok: true }, { headers: HEADERS })

  } catch (err) {
    console.error('resend-setup-email error:', err)
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500, headers: HEADERS })
  }
}
