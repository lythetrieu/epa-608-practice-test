-- ─── CERTIFICATES ────────────────────────────────────────────────────────────
-- Stores issued certificates with short public IDs and tier system

-- Add display_name to users_profile for certificate names
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS display_name TEXT NULL;

CREATE TABLE public.certificates (
  id              TEXT PRIMARY KEY,          -- 'EPA-2026-A7X3'
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name       TEXT NOT NULL,             -- display name at time of issue
  category        TEXT NOT NULL,             -- 'Core' | 'Type I' | 'Type II' | 'Type III' | 'Universal'
  tier            TEXT NOT NULL CHECK (tier IN ('pass', 'advanced', 'expert', 'master')),
  score           INT NOT NULL,              -- percentage 0-100
  total_questions INT NOT NULL,
  correct_answers INT NOT NULL,
  session_id      UUID REFERENCES public.test_sessions(id),
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certificates_user ON public.certificates(user_id, issued_at DESC);
CREATE INDEX idx_certificates_category_tier ON public.certificates(user_id, category, tier);

-- RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can read their own certificates
CREATE POLICY "Users can read own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Public can read any certificate by ID (for shared links)
CREATE POLICY "Public can read certificates by id"
  ON public.certificates FOR SELECT
  USING (true);

-- Only service role inserts (via API)
-- No INSERT/UPDATE/DELETE policy for anon/authenticated = blocked by RLS

-- ─── FUNCTION: Generate short cert ID ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_cert_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no I,O,0,1 to avoid confusion
  result TEXT;
  i INT;
  yr TEXT;
BEGIN
  yr := EXTRACT(YEAR FROM NOW())::TEXT;
  LOOP
    result := 'EPA-' || yr || '-';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE id = result);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ─── FUNCTION: Issue certificate ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_user_id UUID,
  p_user_name TEXT,
  p_category TEXT,
  p_score INT,
  p_total_questions INT,
  p_correct_answers INT,
  p_session_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
  v_pct INT;
  v_cert_id TEXT;
  v_existing TEXT;
BEGIN
  -- Calculate percentage
  v_pct := ROUND((p_correct_answers::NUMERIC / p_total_questions) * 100);

  -- Determine tier
  IF v_pct = 100 THEN
    v_tier := 'master';
  ELSIF v_pct >= 90 THEN
    v_tier := 'expert';
  ELSIF v_pct >= 80 THEN
    v_tier := 'advanced';
  ELSIF v_pct >= 70 THEN
    v_tier := 'pass';
  ELSE
    RETURN jsonb_build_object('issued', false, 'reason', 'Score below 70%');
  END IF;

  -- Check if user already has this category+tier (or higher)
  SELECT id INTO v_existing FROM public.certificates
  WHERE user_id = p_user_id
    AND category = p_category
    AND tier = v_tier
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'Already earned', 'cert_id', v_existing, 'tier', v_tier);
  END IF;

  -- Generate unique ID and insert
  v_cert_id := public.generate_cert_id();

  INSERT INTO public.certificates (id, user_id, user_name, category, tier, score, total_questions, correct_answers, session_id)
  VALUES (v_cert_id, p_user_id, p_user_name, p_category, v_tier, v_pct, p_total_questions, p_correct_answers, p_session_id);

  RETURN jsonb_build_object(
    'issued', true,
    'cert_id', v_cert_id,
    'tier', v_tier,
    'score', v_pct
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
