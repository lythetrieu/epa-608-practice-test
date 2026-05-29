-- Team admin view: see all members in their team
-- Security is enforced via SECURITY DEFINER + auth.uid() check.
-- Views do not support RLS; we filter in the view definition instead.
CREATE OR REPLACE VIEW public.team_members_view
WITH (security_invoker = true)
AS
SELECT
  up.id AS user_id,
  up.email,
  up.team_id,
  up.is_team_admin,
  up.created_at AS joined_at
FROM public.users_profile up
WHERE
  up.team_id IS NOT NULL
  AND up.team_id = (
    SELECT team_id FROM public.users_profile
    WHERE id = auth.uid() AND is_team_admin = true
    LIMIT 1
  );

-- Function: admin can remove a team member
CREATE OR REPLACE FUNCTION public.remove_team_member(p_target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_profile users_profile%ROWTYPE;
  v_target_profile users_profile%ROWTYPE;
BEGIN
  SELECT * INTO v_caller_profile FROM users_profile WHERE id = auth.uid();
  SELECT * INTO v_target_profile FROM users_profile WHERE id = p_target_user_id;

  IF NOT v_caller_profile.is_team_admin THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  IF v_target_profile.team_id != v_caller_profile.team_id THEN
    RETURN jsonb_build_object('error', 'User not in your team');
  END IF;

  IF p_target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('error', 'Cannot remove yourself');
  END IF;

  UPDATE teams SET seats_used = seats_used - 1
  WHERE id = v_caller_profile.team_id;

  UPDATE users_profile
  SET team_id = NULL, is_team_admin = false, tier = 'free'
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
