// Shared Pro-access fulfillment. Used by the Polar webhook (and reusable by any
// other payment provider). Grants lifetime Pro to a buyer's email:
//   - existing account → upgrade in place + send "you're on Pro" email
//   - no account       → create one with a temp password + send welcome email
// Idempotent: a buyer who already has lifetime access is a no-op (safe for
// webhook retries / replays).

import { createAdminClient } from '@/lib/supabase/server'
import { generateTempPassword } from '@/lib/auth/temp-password'
import { APP_URL } from '@/lib/site-config'

const FROM = 'EPA 608 Practice Test <support@epa608practicetest.net>'

async function getResendKey(admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const { data } = await admin.from('app_config').select('value').eq('key', 'resend_api_key').single()
  return data?.value ?? null
}

async function sendProUpgradeEmail(resendKey: string, email: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [email],
      subject: "You're on EPA 608 Pro",
      text: `EPA 608 Practice Test\n\nYou're on EPA 608 Pro\n\nYour account ${email} now has Pro.\n\nLog in:\n${APP_URL}/login\n\nSign in with your email and password.\n\n—\nEPA 608 Practice Test · epa608practicetest.net`,
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
<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">Sign in with your email and password.</p>
<div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px;font-size:13px;line-height:1.5;color:#64748b;">EPA 608 Practice Test &middot; epa608practicetest.net<br><a href="${APP_URL}/settings" style="color:#64748b;text-decoration:underline;">Manage email preferences</a></div>
</td></tr></table>
</td></tr></table>
</body></html>`,
    }),
  })
  if (!res.ok) console.error('Pro upgrade email failed:', res.status, await res.text().catch(() => ''))
}

async function sendProWelcomeEmail(resendKey: string, email: string, tempPassword: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
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
  if (!res.ok) console.error('Pro welcome email failed:', res.status, await res.text().catch(() => ''))
}

export type FulfillmentResult =
  | { ok: true; email: string; status: 'already_pro' | 'upgraded' | 'created' }
  | { ok: true; email: string; status: 'created_setup_failed' }
  | { ok: false; error: string }

/**
 * Grant lifetime Pro to `email`. Idempotent. `orderRef` is the provider's order
 * id, recorded for audit/dedupe.
 */
export async function grantProAccess(emailRaw: string, orderRef: string): Promise<FulfillmentResult> {
  const email = emailRaw.toLowerCase().trim()
  if (!email) return { ok: false, error: 'missing_email' }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users_profile')
    .select('id, lifetime_access')
    .eq('email', email)
    .single()

  // Existing account
  if (profile) {
    if (profile.lifetime_access) {
      return { ok: true, email, status: 'already_pro' } // idempotent — no re-email
    }
    const { error: upgradeError } = await admin
      .from('users_profile')
      .update({ tier: 'starter', lifetime_access: true })
      .eq('id', profile.id)
    if (upgradeError) {
      console.error('grantProAccess upgrade failed:', upgradeError)
      return { ok: false, error: 'upgrade_failed' }
    }
    await admin.from('pending_upgrades').delete().eq('email', email)

    const resendKey = await getResendKey(admin)
    if (resendKey) await sendProUpgradeEmail(resendKey, email).catch((e) => console.error('upgrade email:', e))
    return { ok: true, email, status: 'upgraded' }
  }

  // No account → record the purchase first, then create the account.
  await admin
    .from('pending_upgrades')
    .upsert({ email, tier: 'starter', ls_order_id: orderRef }, { onConflict: 'email' })
    .then(({ error }) => { if (error) console.error('pending_upgrades upsert:', error) })

  const tempPassword = generateTempPassword()
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { source: 'polar', order_id: orderRef },
  })

  if (createError || !newUser?.user) {
    // pending_upgrades is saved → they can sign up manually and get Pro applied.
    console.error('grantProAccess createUser failed:', createError)
    return { ok: true, email, status: 'created_setup_failed' }
  }

  const resendKey = await getResendKey(admin)
  if (resendKey) await sendProWelcomeEmail(resendKey, email, tempPassword).catch((e) => console.error('welcome email:', e))

  return { ok: true, email, status: 'created' }
}
