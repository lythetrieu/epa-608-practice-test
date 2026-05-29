-- ============================================================
-- EPA 608 Platform — Cloud Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── MIGRATION 001: Initial Schema ──────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS PROFILE
CREATE TABLE IF NOT EXISTS public.users_profile (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  tier                TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'ultimate')),
  lifetime_access     BOOLEAN NOT NULL DEFAULT false,
  team_id             UUID NULL,
  is_team_admin       BOOLEAN NOT NULL DEFAULT false,
  ai_queries_today    INT NOT NULL DEFAULT 0,
  ai_queries_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paddle_customer_id  TEXT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TEAMS
CREATE TABLE IF NOT EXISTS public.teams (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  owner_id                UUID NOT NULL REFERENCES auth.users(id),
  seats_total             INT NOT NULL CHECK (seats_total BETWEEN 5 AND 50),
  seats_used              INT NOT NULL DEFAULT 1,
  invite_code             TEXT NOT NULL UNIQUE,
  invite_code_expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  paddle_subscription_id  TEXT NULL,
  expires_at              TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('Core', 'Type I', 'Type II', 'Type III')),
  subtopic_id TEXT NULL,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  answer_text TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  source_ref  TEXT NOT NULL DEFAULT '',
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  verified    BOOLEAN NOT NULL DEFAULT false,
  tags        JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- USER PROGRESS
CREATE TABLE IF NOT EXISTS public.user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES public.questions(id),
  correct       BOOLEAN NOT NULL,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TEST SESSIONS
CREATE TABLE IF NOT EXISTS public.test_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  question_ids    JSONB NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_limit_secs INT NOT NULL DEFAULT 1800,
  submitted_at    TIMESTAMPTZ NULL,
  score           INT NULL,
  total           INT NOT NULL,
  is_expired      BOOLEAN NOT NULL DEFAULT false
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category, verified);
CREATE INDEX IF NOT EXISTS idx_questions_subtopic ON public.questions(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_question ON public.user_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.test_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_invite ON public.teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_profile_team ON public.users_profile(team_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_profile_updated_at ON public.users_profile;
CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- JOIN TEAM function
CREATE OR REPLACE FUNCTION public.join_team(p_invite_code TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_profile users_profile%ROWTYPE;
BEGIN
  SELECT * INTO v_team FROM teams
  WHERE invite_code = p_invite_code
    AND expires_at > NOW()
    AND invite_code_expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite code');
  END IF;

  IF v_team.seats_used >= v_team.seats_total THEN
    RETURN jsonb_build_object('error', 'No seats available');
  END IF;

  SELECT * INTO v_profile FROM users_profile WHERE id = p_user_id;
  IF v_profile.team_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already in a team');
  END IF;

  UPDATE teams SET seats_used = seats_used + 1 WHERE id = v_team.id;
  UPDATE users_profile
  SET team_id = v_team.id, tier = 'ultimate', is_team_admin = false
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'team_id', v_team.id, 'team_name', v_team.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── MIGRATION 002: RLS Policies ────────────────────────────

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "users_profile_select_own" ON public.users_profile;
CREATE POLICY "users_profile_select_own" ON public.users_profile
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_profile_update_own" ON public.users_profile;
CREATE POLICY "users_profile_update_own" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (SELECT tier FROM public.users_profile WHERE id = auth.uid())
    AND lifetime_access = (SELECT lifetime_access FROM public.users_profile WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "teams_select_member" ON public.teams;
CREATE POLICY "teams_select_member" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.users_profile WHERE id = auth.uid() AND team_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "teams_update_admin" ON public.teams;
CREATE POLICY "teams_update_admin" ON public.teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM public.users_profile
      WHERE id = auth.uid() AND is_team_admin = true AND team_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "progress_select_own" ON public.user_progress;
CREATE POLICY "progress_select_own" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_insert_own" ON public.user_progress;
CREATE POLICY "progress_insert_own" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_select_own" ON public.test_sessions;
CREATE POLICY "sessions_select_own" ON public.test_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON public.test_sessions;
CREATE POLICY "sessions_insert_own" ON public.test_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON public.test_sessions;
CREATE POLICY "sessions_update_own" ON public.test_sessions
  FOR UPDATE USING (auth.uid() = user_id AND submitted_at IS NULL);

-- ─── MIGRATION 003: Team Member View ────────────────────────

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
