-- Migration 024: Fix auth email hook links
--
-- Bugs reported by customer:
--   1. Reset-password link in email lands on /login (and loops) instead of /reset-password.
--   2. New-account confirmation emails effectively broken because links pointed to localhost.
--
-- Root cause (in send_email_hook from 009_email_templates_redesign.sql):
--   - Recovery links went through /auth/v1/verify -> /auth/callback. For recovery, Supabase's
--     /auth/v1/verify does NOT return a ?code=, so /auth/callback (which only handles ?code=)
--     redirected to /login?error=auth_failed -> the "link goes to login" loop.
--   - site_url defaulted to 'http://localhost:3001'; if app_config.site_url is unset in
--     production, every link breaks (both signup confirm and recovery).
--
-- Fix (this CREATE OR REPLACE overrides the function; HTML templates kept identical):
--   - site_url default changed to 'https://epa608practicetest.net' (declaration + coalesce fallback).
--   - recovery: link goes STRAIGHT to /reset-password?token_hash=...&type=recovery so the client
--     can call verifyOtp({token_hash}) (works in every browser, no PKCE needed; same pattern as
--     the PayPal email flow). No more /auth/v1/verify -> /auth/callback hop for recovery.
--   - signup: kept the /auth/v1/verify mechanism (email must be confirmed before entering the app),
--     with redirect_to = site_url || '/auth/callback?next=/dashboard'.
--
-- supabase_url is left hard-coded to the production project (unchanged).

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
  token TEXT;
  token_hash TEXT;
  confirm_url TEXT;
  callback_url TEXT;
  email_subject TEXT;
  email_html TEXT;
  request_id BIGINT;
  header_html TEXT;
  footer_html TEXT;
BEGIN
  SELECT value INTO resend_api_key FROM public.app_config WHERE key = 'resend_api_key';
  IF resend_api_key IS NULL THEN
    RETURN event;
  END IF;

  -- Check for production site_url override
  SELECT value INTO site_url FROM public.app_config WHERE key = 'site_url';
  IF site_url IS NULL THEN
    site_url := coalesce(event -> 'email_data' ->> 'site_url', 'https://epa608practicetest.net');
  END IF;

  user_email := event -> 'user' ->> 'email';
  email_action := event -> 'email_data' ->> 'email_action_type';
  token := event -> 'email_data' ->> 'token';
  token_hash := event -> 'email_data' ->> 'token_hash';

  -- Build the action URL based on action type.
  --   recovery: link straight to /reset-password with token_hash (client calls verifyOtp).
  --   signup (and others): go through Supabase /auth/v1/verify then /auth/callback.
  CASE email_action
    WHEN 'recovery' THEN
      confirm_url := site_url || '/reset-password?token_hash=' || token_hash || '&type=recovery';
    WHEN 'signup' THEN
      callback_url := site_url || '/auth/callback?next=/dashboard';
      confirm_url := supabase_url || '/auth/v1/verify?token=' || token_hash
        || '&type=signup'
        || '&redirect_to=' || callback_url;
    ELSE
      callback_url := site_url || '/auth/callback?next=/dashboard';
      confirm_url := supabase_url || '/auth/v1/verify?token=' || token_hash
        || '&type=' || email_action
        || '&redirect_to=' || callback_url;
  END CASE;

  -- Shared header
  header_html :=
    '<!DOCTYPE html>'
    '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
    '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">'
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f3f4f6;">'
    '<tr><td align="center" style="padding:24px 16px;">'
    '<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'
    '<tr><td style="background-color:#1e40af;padding:32px 40px;text-align:center;">'
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>'
    '<td align="center">'
    '<span style="font-size:28px;color:#ffffff;display:block;margin-bottom:4px;">&#9889;</span>'
    '<span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">EPA 608 Practice Test</span>'
    '</td></tr></table>'
    '</td></tr>';

  -- Shared footer
  footer_html := format(
    '<tr><td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">'
    '<p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.5;">EPA 608 Practice Test &mdash; Free HVAC Certification Prep</p>'
    '<p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;line-height:1.5;">'
    '<a href="%s" style="color:#9ca3af;text-decoration:underline;">Visit Website</a>'
    ' &nbsp;|&nbsp; '
    '<a href="mailto:support@epa608practicetest.net" style="color:#9ca3af;text-decoration:underline;">Contact Support</a>'
    '</p>'
    '</td></tr>'
    '</table>'
    '</td></tr></table>'
    '</body></html>',
    site_url
  );

  CASE email_action
    WHEN 'signup' THEN
      email_subject := 'Confirm your EPA 608 Practice Test account';
      email_html := header_html
        || format(
          '<tr><td style="padding:40px 40px 16px 40px;">'
          '<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:bold;color:#111827;line-height:1.3;">Confirm Your Email</h1>'
          '<p style="margin:0 0 8px 0;font-size:16px;color:#4b5563;line-height:1.6;">Thanks for signing up! Please confirm your email address to activate your free account and start practicing for the EPA 608 exam.</p>'
          '</td></tr>'

          '<tr><td style="padding:8px 40px 16px 40px;text-align:center;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>'
          '<td style="background-color:#1e40af;border-radius:8px;">'
          '<a href="%s" target="_blank" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Confirm Email Address</a>'
          '</td></tr></table>'
          '</td></tr>'

          '<tr><td style="padding:0 40px 40px 40px;">'
          '<p style="margin:16px 0 0 0;font-size:13px;color:#9ca3af;line-height:1.5;text-align:center;">If you didn''t create this account, you can safely ignore this email.</p>'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin-top:20px;"><tr>'
          '<td style="padding:12px 16px;background-color:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b;">'
          '<p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">&#128279; <strong>Button not working?</strong> Copy and paste this link into your browser:</p>'
          '<p style="margin:4px 0 0 0;font-size:12px;color:#92400e;word-break:break-all;">%s</p>'
          '</td></tr></table>'
          '</td></tr>',
          confirm_url,
          confirm_url
        )
        || footer_html;

    WHEN 'recovery' THEN
      email_subject := 'Reset your EPA 608 password';
      email_html := header_html
        || format(
          '<tr><td style="padding:40px 40px 16px 40px;">'
          '<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:bold;color:#111827;line-height:1.3;">Reset Your Password</h1>'
          '<p style="margin:0 0 8px 0;font-size:16px;color:#4b5563;line-height:1.6;">We received a request to reset the password for your EPA 608 Practice Test account. Click the button below to choose a new password.</p>'
          '</td></tr>'

          '<tr><td style="padding:8px 40px 16px 40px;text-align:center;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>'
          '<td style="background-color:#1e40af;border-radius:8px;">'
          '<a href="%s" target="_blank" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Reset Password</a>'
          '</td></tr></table>'
          '</td></tr>'

          '<tr><td style="padding:0 40px 40px 40px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin-top:16px;"><tr>'
          '<td style="padding:12px 16px;background-color:#fef2f2;border-radius:6px;border-left:4px solid #ef4444;">'
          '<p style="margin:0;font-size:13px;color:#991b1b;line-height:1.5;">&#128274; <strong>Security note:</strong> This link expires in 1 hour. If you didn''t request a password reset, please ignore this email — your account is safe.</p>'
          '</td></tr></table>'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin-top:12px;"><tr>'
          '<td style="padding:12px 16px;background-color:#fef3c7;border-radius:6px;border-left:4px solid #f59e0b;">'
          '<p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">&#128279; <strong>Button not working?</strong> Copy and paste this link into your browser:</p>'
          '<p style="margin:4px 0 0 0;font-size:12px;color:#92400e;word-break:break-all;">%s</p>'
          '</td></tr></table>'
          '</td></tr>',
          confirm_url,
          confirm_url
        )
        || footer_html;

    ELSE
      email_subject := 'EPA 608 Practice Test';
      email_html := header_html
        || format(
          '<tr><td style="padding:40px 40px 40px 40px;text-align:center;">'
          '<p style="margin:0 0 16px 0;font-size:16px;color:#4b5563;line-height:1.6;">Click below to continue:</p>'
          '<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>'
          '<td style="background-color:#1e40af;border-radius:8px;">'
          '<a href="%s" target="_blank" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">Continue</a>'
          '</td></tr></table>'
          '</td></tr>',
          confirm_url
        )
        || footer_html;
  END CASE;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || resend_api_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'EPA 608 Practice Test <noreply@epa608practicetest.net>',
      'to', jsonb_build_array(user_email),
      'subject', email_subject,
      'html', email_html
    )
  ) INTO request_id;

  RETURN event;
END;
$function$;
