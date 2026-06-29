-- Per-account Study Path progress (replaces localStorage-only progress).
-- Each user has their own row per concept: status + score history.

CREATE TABLE IF NOT EXISTS public.study_path_progress (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id  TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | reviewed | mastered | weak
  pass_count  INT         NOT NULL DEFAULT 0,
  attempts    INT         NOT NULL DEFAULT 0,
  best_score  INT         NOT NULL DEFAULT 0,           -- best percentage achieved
  last_score  INT         NULL,                         -- most recent attempt percentage
  last_passed TIMESTAMPTZ NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_spp_user ON public.study_path_progress(user_id);

ALTER TABLE public.study_path_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spp_select_own" ON public.study_path_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "spp_insert_own" ON public.study_path_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spp_update_own" ON public.study_path_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
