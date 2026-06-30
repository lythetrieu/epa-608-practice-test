-- ============================================================================
-- 20260630: Data-model extension — learning assets, content engagement,
-- learning events (telemetry), and extra user_progress columns.
--
-- FULLY ADDITIVE. Existing features (Weak Spots, practice tracking, Study Path)
-- keep working whether or not this has run. The new user_progress columns are
-- all nullable with no defaults, so they do not rewrite the table.
--
-- NOTE: concepts.id is TEXT (see 011_concept_tracking.sql), so every concept_id
-- reference below is TEXT — NOT uuid.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. learning_assets — CONTENT table (no user_id). Seeded by admin only.
--    Readable by any authenticated user, matching the concepts/questions
--    read-policy pattern.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id    TEXT REFERENCES public.concepts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('video', 'pdf', 'infographic')),
  title         TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL,                    -- ABSOLUTE url
  thumbnail_url TEXT,
  duration_sec  INT,
  sort_order    INT NOT NULL DEFAULT 0,
  is_pro        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_assets_concept_sort
  ON public.learning_assets(concept_id, sort_order);

ALTER TABLE public.learning_assets ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read assets (admin seeds via service role / SQL).
-- No INSERT/UPDATE/DELETE policy → users cannot write.
DROP POLICY IF EXISTS "learning_assets_select_authed" ON public.learning_assets;
CREATE POLICY "learning_assets_select_authed" ON public.learning_assets
  FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 2. content_engagement — PER-USER. One row per (user, asset).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_engagement (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id      UUID NOT NULL REFERENCES public.learning_assets(id) ON DELETE CASCADE,
  action        TEXT NOT NULL CHECK (action IN ('view', 'complete')),
  progress_pct  INT NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  seconds_spent INT NOT NULL DEFAULT 0,
  last_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_content_engagement_user
  ON public.content_engagement(user_id);

ALTER TABLE public.content_engagement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_engagement_select_own" ON public.content_engagement;
CREATE POLICY "content_engagement_select_own" ON public.content_engagement
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "content_engagement_insert_own" ON public.content_engagement;
CREATE POLICY "content_engagement_insert_own" ON public.content_engagement
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "content_engagement_update_own" ON public.content_engagement;
CREATE POLICY "content_engagement_update_own" ON public.content_engagement
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. learning_events — PER-USER, append-only telemetry.
--    No UPDATE/DELETE policy → rows are immutable from the client.
--    FUTURE: when volume grows, convert to monthly range partitioning on `ts`
--    (e.g. PARTITION BY RANGE (ts)) and add a retention job to drop old
--    partitions. Not needed at current scale.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concept_id  TEXT,                 -- matches concepts.id (TEXT); not FK-enforced (telemetry)
  question_id TEXT,
  asset_id    UUID,
  session_id  TEXT,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_learning_events_user_ts
  ON public.learning_events(user_id, ts DESC);

ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_events_select_own" ON public.learning_events;
CREATE POLICY "learning_events_select_own" ON public.learning_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "learning_events_insert_own" ON public.learning_events;
CREATE POLICY "learning_events_insert_own" ON public.learning_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. user_progress — additive nullable columns (no defaults → no table rewrite).
--    Existing inserts use explicit column lists, so these stay null until
--    /api/practice/track starts populating them.
-- ----------------------------------------------------------------------------
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS user_answer TEXT;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS time_ms INT;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS attempt_no INT;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS source TEXT;
