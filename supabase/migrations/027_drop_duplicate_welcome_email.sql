-- Migration 027: stop the duplicate "Welcome … Start practicing" email
--
-- handle_new_user() fires AFTER INSERT on auth.users and was BOTH creating the
-- users_profile row AND sending a plain "Welcome <name>! Start practicing at
-- your dashboard" email via Resend. That produced a SECOND email on every
-- signup (alongside the confirm email) and on every Pro purchase (alongside the
-- proper welcome + temp-password email from /api/paypal/capture).
--
-- Fix: remove the email-sending block; keep only the critical profile creation.
-- After this, each flow has a single email:
--   signup   → "Confirm your email"  (send_email_hook)
--   purchase → "Welcome to EPA 608 Pro" + temp password  (paypal/capture)

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Create profile (critical — must not fail)
  INSERT INTO public.users_profile (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;
