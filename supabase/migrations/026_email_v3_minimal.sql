-- Migration 026: minimal "big-SaaS" v3 templates for hook emails + plaintext
--
-- Replaces the recovery + signup email HTML in send_email_hook with the lean
-- v3 design (soft palette, minimal copy, quiet security note, <4KB) and adds a
-- plaintext alternative (the "text" field) to the Resend payload for better
-- deliverability. URL routing is unchanged from 025:
--   recovery -> /reset-password?token_hash=...&type=recovery   (client verifyOtp)
--   signup   -> /auth/callback?token_hash=...&type=signup&next=/dashboard (server verifyOtp)
--   other    -> /auth/v1/verify -> /auth/callback
-- Built with || concatenation (not format()) so literal % needs no escaping.

CREATE OR REPLACE FUNCTION public.send_email_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  resend_api_key TEXT;
  supabase_url TEXT := 'https://sequvmxgtmbirnixeril.supabase.co';
  site_url TEXT := 'https://epa608practicetest.net';
  user_email TEXT;
  email_action TEXT;
  token_hash TEXT;
  confirm_url TEXT;
  callback_url TEXT;
  email_subject TEXT;
  preheader TEXT;
  body_html TEXT;
  email_html TEXT;
  email_text TEXT;
  shell_top TEXT;
  shell_bottom TEXT;
  header_html TEXT;
  footer_html TEXT;
  request_id BIGINT;
BEGIN
  SELECT value INTO resend_api_key FROM public.app_config WHERE key = 'resend_api_key';
  IF resend_api_key IS NULL THEN
    RETURN event;
  END IF;

  SELECT value INTO site_url FROM public.app_config WHERE key = 'site_url';
  IF site_url IS NULL THEN
    site_url := coalesce(event -> 'email_data' ->> 'site_url', 'https://epa608practicetest.net');
  END IF;
  site_url := rtrim(site_url, '/');

  user_email := event -> 'user' ->> 'email';
  email_action := event -> 'email_data' ->> 'email_action_type';
  token_hash := event -> 'email_data' ->> 'token_hash';

  CASE email_action
    WHEN 'recovery' THEN
      confirm_url := site_url || '/reset-password?token_hash=' || token_hash || '&type=recovery';
    WHEN 'signup' THEN
      confirm_url := site_url || '/auth/callback?token_hash=' || token_hash || '&type=signup&next=/dashboard';
    ELSE
      callback_url := site_url || '/auth/callback?next=/dashboard';
      confirm_url := supabase_url || '/auth/v1/verify?token=' || token_hash
        || '&type=' || email_action
        || '&redirect_to=' || callback_url;
  END CASE;

  -- Shared shell (lean, single 600px card) + header + footer
  header_html :=
    '<div style="font-size:16px;font-weight:600;color:#1f2a44;padding-bottom:28px;">'
    '<span style="color:#003087;">&#9889;</span> EPA 608 Practice Test</div>';

  footer_html :=
    '<div style="border-top:1px solid #e2e8f0;margin-top:20px;padding-top:20px;font-size:13px;line-height:1.5;color:#64748b;">'
    'EPA 608 Practice Test &middot; epa608practicetest.net<br>'
    '<a href="' || site_url || '/settings" style="color:#64748b;text-decoration:underline;">Manage email preferences</a></div>';

  shell_bottom := '</td></tr></table></td></tr></table></body></html>';

  -- Per-action subject / preheader / body / plaintext
  CASE email_action
    WHEN 'signup' THEN
      email_subject := 'Confirm your email';
      preheader := 'Confirm your email to start practicing.';
      body_html :=
        '<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">Confirm your email</h1>'
        '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Confirm your email to start practicing.</p>'
        || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:6px;background:#c2691c;">'
        || '<a href="' || confirm_url || '" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Confirm email</a></td></tr></table>'
        || '<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#64748b;">Or paste this link into your browser:<br><a href="' || confirm_url || '" style="color:#003087;text-decoration:underline;word-break:break-all;">' || confirm_url || '</a></p>'
        || '<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">If you didn''t sign up, you can ignore this email.</p>';
      email_text :=
        E'EPA 608 Practice Test\n\nConfirm your email\n\nConfirm your email to start practicing.\n\nConfirm email:\n'
        || confirm_url
        || E'\n\nIf you didn''t sign up, you can ignore this email.\n\n—\nEPA 608 Practice Test · epa608practicetest.net';

    WHEN 'recovery' THEN
      email_subject := 'Reset your password';
      preheader := 'Reset your EPA 608 Practice Test password.';
      body_html :=
        '<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">Reset your password</h1>'
        '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Click below to choose a new password.</p>'
        || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:6px;background:#c2691c;">'
        || '<a href="' || confirm_url || '" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Reset password</a></td></tr></table>'
        || '<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#64748b;">Or paste this link into your browser:<br><a href="' || confirm_url || '" style="color:#003087;text-decoration:underline;word-break:break-all;">' || confirm_url || '</a></p>'
        || '<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">This link expires in 1 hour. If you didn''t request this, you can ignore this email.</p>';
      email_text :=
        E'EPA 608 Practice Test\n\nReset your password\n\nClick the link below to choose a new password.\n\nReset password:\n'
        || confirm_url
        || E'\n\nThis link expires in 1 hour. If you didn''t request this, you can ignore this email.\n\n—\nEPA 608 Practice Test · epa608practicetest.net';

    ELSE
      email_subject := 'EPA 608 Practice Test';
      preheader := 'Continue to EPA 608 Practice Test.';
      body_html :=
        '<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#1f2a44;">Continue to your account</h1>'
        '<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Click below to continue.</p>'
        || '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-radius:6px;background:#c2691c;">'
        || '<a href="' || confirm_url || '" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Continue</a></td></tr></table>'
        || '<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">Or paste this link into your browser:<br><a href="' || confirm_url || '" style="color:#003087;text-decoration:underline;word-break:break-all;">' || confirm_url || '</a></p>';
      email_text :=
        E'EPA 608 Practice Test\n\nContinue to your account\n\nOpen this link:\n'
        || confirm_url
        || E'\n\n—\nEPA 608 Practice Test · epa608practicetest.net';
  END CASE;

  shell_top :=
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<meta name="color-scheme" content="light only"><title>EPA 608 Practice Test</title></head>'
    '<body style="margin:0;padding:0;background:#f7f8fa;">'
    || '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f7f8fa;opacity:0;">' || preheader || '</div>'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;"><tr><td align="center" style="padding:32px 16px;">'
    || '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">'
    || '<tr><td style="padding:32px 40px;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,Helvetica,Arial,sans-serif;">';

  email_html := shell_top || header_html || body_html || footer_html || shell_bottom;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || resend_api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'EPA 608 Practice Test <noreply@epa608practicetest.net>',
      'to', jsonb_build_array(user_email),
      'subject', email_subject,
      'html', email_html,
      'text', email_text
    )
  ) INTO request_id;

  RETURN event;
END;
$function$;
