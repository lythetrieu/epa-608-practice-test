CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  resend_api_key TEXT;
  site_url TEXT;
  request_id BIGINT;
  user_name TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.users_profile (id, email)
  VALUES (NEW.id, NEW.email);

  -- Send welcome email via Resend
  SELECT value INTO resend_api_key FROM public.app_config WHERE key = 'resend_api_key';
  SELECT value INTO site_url FROM public.app_config WHERE key = 'site_url';
  site_url := coalesce(site_url, 'https://ept-seven.vercel.app');
  user_name := split_part(NEW.email, '@', 1);

  IF resend_api_key IS NOT NULL THEN
    SELECT net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || resend_api_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'EPA 608 Practice Test <noreply@epa608practicetest.net>',
        'to', jsonb_build_array(NEW.email),
        'subject', 'Welcome to EPA 608 Practice Test!',
        'html', format(
          '<!DOCTYPE html>'
          '<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
          '<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="background-color:#f3f4f6;">'
          '<tr><td align="center" style="padding:24px 16px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">'

          '<!-- Header -->'
          '<tr><td style="background-color:#1e40af;padding:32px 40px;text-align:center;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%"><tr>'
          '<td align="center">'
          '<span style="font-size:28px;color:#ffffff;display:block;margin-bottom:4px;">&#9889;</span>'
          '<span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">EPA 608 Practice Test</span>'
          '</td></tr></table>'
          '</td></tr>'

          '<!-- Body -->'
          '<tr><td style="padding:40px 40px 24px 40px;">'
          '<h1 style="margin:0 0 16px 0;font-size:24px;font-weight:bold;color:#111827;line-height:1.3;">Welcome aboard, %s!</h1>'
          '<p style="margin:0 0 24px 0;font-size:16px;color:#4b5563;line-height:1.6;">Your free account is ready. You now have full access to everything you need to pass your EPA 608 certification exam.</p>'
          '</td></tr>'

          '<!-- Features -->'
          '<tr><td style="padding:0 40px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%" style="margin-bottom:24px;">'

          '<tr><td style="padding:12px 16px;background-color:#eff6ff;border-radius:8px;margin-bottom:8px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%"><tr>'
          '<td width="40" valign="top" style="font-size:20px;padding-right:12px;">&#128218;</td>'
          '<td><span style="font-size:15px;font-weight:600;color:#1e40af;display:block;margin-bottom:2px;">531 Verified Exam Questions</span>'
          '<span style="font-size:13px;color:#6b7280;">Real questions covering all EPA 608 exam sections</span></td>'
          '</tr></table></td></tr>'
          '<tr><td style="height:8px;"></td></tr>'

          '<tr><td style="padding:12px 16px;background-color:#eff6ff;border-radius:8px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%"><tr>'
          '<td width="40" valign="top" style="font-size:20px;padding-right:12px;">&#129302;</td>'
          '<td><span style="font-size:15px;font-weight:600;color:#1e40af;display:block;margin-bottom:2px;">AI-Powered Study Tutor</span>'
          '<span style="font-size:13px;color:#6b7280;">Get instant explanations and personalized guidance</span></td>'
          '</tr></table></td></tr>'
          '<tr><td style="height:8px;"></td></tr>'

          '<tr><td style="padding:12px 16px;background-color:#eff6ff;border-radius:8px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%"><tr>'
          '<td width="40" valign="top" style="font-size:20px;padding-right:12px;">&#128200;</td>'
          '<td><span style="font-size:15px;font-weight:600;color:#1e40af;display:block;margin-bottom:2px;">Progress Tracking</span>'
          '<span style="font-size:13px;color:#6b7280;">Track scores, identify weak spots, and watch yourself improve</span></td>'
          '</tr></table></td></tr>'
          '<tr><td style="height:8px;"></td></tr>'

          '<tr><td style="padding:12px 16px;background-color:#eff6ff;border-radius:8px;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" width="100%%"><tr>'
          '<td width="40" valign="top" style="font-size:20px;padding-right:12px;">&#127919;</td>'
          '<td><span style="font-size:15px;font-weight:600;color:#1e40af;display:block;margin-bottom:2px;">Smart Weak-Spot Training</span>'
          '<span style="font-size:13px;color:#6b7280;">AI builds custom quizzes targeting your weakest areas</span></td>'
          '</tr></table></td></tr>'

          '</table></td></tr>'

          '<!-- CTA Button -->'
          '<tr><td style="padding:8px 40px 40px 40px;text-align:center;">'
          '<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>'
          '<td style="background-color:#1e40af;border-radius:8px;">'
          '<a href="%s/dashboard" target="_blank" style="display:inline-block;padding:16px 48px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Start Practicing</a>'
          '</td></tr></table>'
          '</td></tr>'

          '<!-- Footer -->'
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
          user_name,
          site_url,
          site_url
        )
      )
    ) INTO request_id;
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.send_email_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
DECLARE
  resend_api_key TEXT;
  supabase_url TEXT := 'https://sequvmxgtmbirnixeril.supabase.co';
  site_url TEXT := 'http://localhost:3001';
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
    site_url := coalesce(event -> 'email_data' ->> 'site_url', 'http://localhost:3001');
  END IF;

  user_email := event -> 'user' ->> 'email';
  email_action := event -> 'email_data' ->> 'email_action_type';
  token := event -> 'email_data' ->> 'token';
  token_hash := event -> 'email_data' ->> 'token_hash';

  -- Build callback URL based on action type
  CASE email_action
    WHEN 'recovery' THEN
      callback_url := site_url || '/auth/callback?type=recovery';
    ELSE
      callback_url := site_url || '/auth/callback?next=/dashboard';
  END CASE;

  -- Build confirmation URL
  confirm_url := supabase_url || '/auth/v1/verify?token=' || token_hash
    || '&type=' || email_action
    || '&redirect_to=' || callback_url;

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
