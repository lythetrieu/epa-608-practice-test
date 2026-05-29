-- Make apply_pending_upgrade safe — never block user creation
CREATE OR REPLACE FUNCTION apply_pending_upgrade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pending record;
BEGIN
  BEGIN
    SELECT * INTO pending
    FROM pending_upgrades
    WHERE email = lower(new.email)
    LIMIT 1;

    IF found THEN
      UPDATE users_profile
      SET tier = pending.tier, lifetime_access = true
      WHERE id = new.id;

      DELETE FROM pending_upgrades WHERE email = lower(new.email);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'apply_pending_upgrade failed for % (%): %', new.email, SQLSTATE, SQLERRM;
  END;

  RETURN new;
END;
$$;

-- Also make handle_new_user safe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  resend_api_key TEXT;
  site_url TEXT;
  request_id BIGINT;
  user_name TEXT;
BEGIN
  -- Create profile (critical — must not fail)
  INSERT INTO public.users_profile (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Send welcome email (non-critical — errors must not block signup)
  BEGIN
    SELECT value INTO resend_api_key FROM public.app_config WHERE key = 'resend_api_key';
    SELECT value INTO site_url FROM public.app_config WHERE key = 'site_url';
    site_url := coalesce(site_url, 'https://epa608practicetest.net');
    user_name := split_part(NEW.email, '@', 1);

    IF resend_api_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || resend_api_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'EPA 608 Practice Test <noreply@epa608practicetest.net>',
          'to', jsonb_build_array(NEW.email),
          'subject', 'Welcome to EPA 608 Practice Test!',
          'html', '<p>Welcome ' || user_name || '!</p><p>Start practicing at <a href="' || site_url || '/dashboard">your dashboard</a>.</p>'
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;
