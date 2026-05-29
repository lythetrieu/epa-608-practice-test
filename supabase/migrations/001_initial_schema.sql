-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS PROFILE ─────────────────────────────────────────────────────────
-- Extends Supabase auth.users
CREATE TABLE public.users_profile (
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

-- ─── TEAMS ─────────────────────────────────────────────────────────────────
CREATE TABLE public.teams (
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

-- ─── QUESTIONS ──────────────────────────────────────────────────────────────
-- No RLS policy → only service_role can access
CREATE TABLE public.questions (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL CHECK (category IN ('Core', 'Type I', 'Type II', 'Type III')),
  subtopic_id TEXT NULL,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,       -- string[]
  answer_text TEXT NOT NULL,        -- NEVER exposed via API
  explanation TEXT NOT NULL DEFAULT '',
  source_ref  TEXT NOT NULL DEFAULT '',
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  verified    BOOLEAN NOT NULL DEFAULT false,
  tags        JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USER PROGRESS ──────────────────────────────────────────────────────────
CREATE TABLE public.user_progress (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL REFERENCES public.questions(id),
  correct       BOOLEAN NOT NULL,
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TEST SESSIONS ──────────────────────────────────────────────────────────
CREATE TABLE public.test_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,          -- 'Core' | 'Type I' | 'Type II' | 'Type III' | 'Universal'
  question_ids    JSONB NOT NULL,         -- string[] — IDs of questions in this session
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_limit_secs INT NOT NULL DEFAULT 1800,  -- 30 min
  submitted_at    TIMESTAMPTZ NULL,
  score           INT NULL,
  total           INT NOT NULL,
  is_expired      BOOLEAN NOT NULL DEFAULT false
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_questions_category ON public.questions(category, verified);
CREATE INDEX idx_questions_subtopic ON public.questions(subtopic_id);
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id, answered_at DESC);
CREATE INDEX idx_user_progress_question ON public.user_progress(question_id);
CREATE INDEX idx_sessions_user ON public.test_sessions(user_id, started_at DESC);
CREATE INDEX idx_teams_invite ON public.teams(invite_code);
CREATE INDEX idx_profile_team ON public.users_profile(team_id);

-- ─── TRIGGERS ───────────────────────────────────────────────────────────────
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_profile_updated_at
  BEFORE UPDATE ON public.users_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── JOIN TEAM (atomic, prevents seat overflow) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.join_team(p_invite_code TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_team teams%ROWTYPE;
  v_profile users_profile%ROWTYPE;
BEGIN
  -- Lock the team row
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

  -- Check not already in a team
  SELECT * INTO v_profile FROM users_profile WHERE id = p_user_id;
  IF v_profile.team_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already in a team');
  END IF;

  -- Add member
  UPDATE teams SET seats_used = seats_used + 1 WHERE id = v_team.id;
  UPDATE users_profile
  SET team_id = v_team.id, tier = 'ultimate', is_team_admin = false
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'team_id', v_team.id, 'team_name', v_team.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
