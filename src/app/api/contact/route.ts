import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Get Resend key from Supabase app_config
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'resend_api_key')
      .single()

    const resendKey = configRow?.value
    if (!resendKey) {
      console.error('Resend API key not found in app_config')
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }

    // Send email to site owner
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'EPA 608 Contact Form <support@epa608practicetest.net>',
        to: ['support@epa608practicetest.net'],
        reply_to: email,
        subject: `Contact: ${subject}`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1e293b;">
            <div style="background:#003087;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <h2 style="color:#fff;font-size:18px;margin:0;">New Contact Form Submission</h2>
              <p style="color:#93c5fd;font-size:13px;margin:6px 0 0;">epa608practicetest.net</p>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
              <tr>
                <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;width:90px;color:#64748b;">Name</td>
                <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(name)}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;color:#64748b;">Email</td>
                <td style="padding:10px 12px;border:1px solid #e2e8f0;"><a href="mailto:${escapeHtml(email)}" style="color:#003087;">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600;color:#64748b;">Subject</td>
                <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(subject)}</td>
              </tr>
            </table>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;font-size:14px;line-height:1.7;white-space:pre-wrap;">${escapeHtml(message)}</div>

            <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
              Reply directly to this email to respond to ${escapeHtml(name)}.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Contact API error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
