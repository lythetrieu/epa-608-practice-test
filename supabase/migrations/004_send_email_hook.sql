-- ─── Send Email Auth Hook via Resend API ────────────────────
-- Uses pg_net to call Resend HTTP API directly from Postgres
-- No Edge Function needed, no API gateway 403 issues

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Config table for app secrets (only service_role can read)
CREATE TABLE IF NOT EXISTS public.app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service_role can access

CREATE OR REPLACE FUNCTION public.send_email_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  resend_api_key TEXT;
  user_email TEXT;
  email_action TEXT;
  confirmation_url TEXT;
  token TEXT;
  email_subject TEXT;
  email_html TEXT;
  request_id BIGINT;
BEGIN
  -- Get API key from config table
  SELECT value INTO resend_api_key FROM public.app_config WHERE key = 'resend_api_key';
  IF resend_api_key IS NULL THEN
    RAISE LOG 'send_email_hook: resend_api_key not found in app_config';
    RETURN event;
  END IF;

  -- Extract data from the hook event
  user_email := event -> 'user' ->> 'email';
  email_action := event -> 'email_data' ->> 'email_action_type';
  confirmation_url := event -> 'email_data' ->> 'confirmation_url';
  token := event -> 'email_data' ->> 'token';

  -- Build email content
  CASE email_action
    WHEN 'signup' THEN
      email_subject := 'Confirm your EPA 608 Practice Test account';
      email_html := format(
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">'
        '<h1 style="color: #1e40af; font-size: 24px;">Welcome to EPA 608 Practice Test!</h1>'
        '<p>Click the button below to confirm your email and start practicing:</p>'
        '<a href="%s" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Confirm Email</a>'
        '<p style="color: #666; font-size: 14px;">Or enter this code: <strong>%s</strong></p>'
        '<p style="color: #999; font-size: 12px;">If you didn''t create this account, you can ignore this email.</p>'
        '</div>',
        confirmation_url, token
      );

    WHEN 'recovery' THEN
      email_subject := 'Reset your EPA 608 Practice Test password';
      email_html := format(
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">'
        '<h1 style="color: #1e40af; font-size: 24px;">Password Reset</h1>'
        '<p>Click the button below to reset your password:</p>'
        '<a href="%s" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Reset Password</a>'
        '<p style="color: #999; font-size: 12px;">If you didn''t request this, you can ignore this email.</p>'
        '</div>',
        confirmation_url
      );

    WHEN 'email_change' THEN
      email_subject := 'Confirm your new email address';
      email_html := format(
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">'
        '<h1 style="color: #1e40af; font-size: 24px;">Email Change Confirmation</h1>'
        '<p>Click below to confirm your new email:</p>'
        '<a href="%s" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Confirm New Email</a>'
        '</div>',
        confirmation_url
      );

    ELSE
      email_subject := 'EPA 608 Practice Test';
      email_html := format(
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">'
        '<p>Click the link below:</p>'
        '<a href="%s">Verify</a>'
        '</div>',
        confirmation_url
      );
  END CASE;

  -- Send email via Resend HTTP API using pg_net
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'EPA 608 Practice Test <onboarding@resend.dev>',
      'to', jsonb_build_array(user_email),
      'subject', email_subject,
      'html', email_html
    )
  ) INTO request_id;

  RAISE LOG 'Resend email queued: request_id=%, to=%, action=%', request_id, user_email, email_action;

  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for auth hooks)
GRANT EXECUTE ON FUNCTION public.send_email_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.send_email_hook FROM public;
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin;
