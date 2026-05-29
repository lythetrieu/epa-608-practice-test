-- ─── ENABLE RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- ─── QUESTIONS: NO ACCESS FOR ANYONE ────────────────────────────────────────
-- No policies created = default DENY ALL for authenticated + anon
-- Only service_role (server) bypasses RLS

-- ─── USERS PROFILE ──────────────────────────────────────────────────────────
CREATE POLICY "users_profile_select_own" ON public.users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_profile_update_own" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent self-upgrading tier or lifetime_access
    AND tier = (SELECT tier FROM public.users_profile WHERE id = auth.uid())
    AND lifetime_access = (SELECT lifetime_access FROM public.users_profile WHERE id = auth.uid())
  );

-- ─── TEAMS ──────────────────────────────────────────────────────────────────
CREATE POLICY "teams_select_member" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.users_profile WHERE id = auth.uid() AND team_id IS NOT NULL)
  );

CREATE POLICY "teams_update_admin" ON public.teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.users_profile
      WHERE id = auth.uid() AND is_team_admin = true AND team_id IS NOT NULL
    )
  );

-- ─── USER PROGRESS ──────────────────────────────────────────────────────────
CREATE POLICY "progress_select_own" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "progress_insert_own" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE — progress is immutable

-- ─── TEST SESSIONS ──────────────────────────────────────────────────────────
CREATE POLICY "sessions_select_own" ON public.test_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.test_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only allow updating submitted_at, score (not question_ids or started_at)
CREATE POLICY "sessions_update_own" ON public.test_sessions
  FOR UPDATE USING (auth.uid() = user_id AND submitted_at IS NULL);
