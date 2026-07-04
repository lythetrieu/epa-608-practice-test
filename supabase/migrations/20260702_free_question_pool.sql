-- ─────────────────────────────────────────────────────────────────────────────
-- FREE QUESTION POOL (200 = 50 per category)
-- ─────────────────────────────────────────────────────────────────────────────
-- Free authenticated users may only ever draw from a deterministic, balanced
-- subset of the bank: the 50 lowest-id verified questions in each of the four
-- real categories (Core / Type I / Type II / Type III) = 200 total. Same 200
-- every time (ORDER BY id LIMIT 50), so it is a stable pool, not a daily quota.
--
-- Paid tiers pass p_free_only = false and get the full bank, unchanged.
-- The anon on-page sample (public/* endpoints) is a separate surface, untouched.
--
-- SAFE-DEPLOY: the app code ships BEFORE this migration runs. The RPCs keep the
-- new p_free_only parameter DEFAULTED to false and appended last, so existing
-- callers (and the app's fallback path) keep working if the migration is late.
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns the id set of the FREE pool for a single category: the 50 lowest ids
-- (lexicographic) among verified questions. Reused by the RPCs below and kept
-- as its own function so the "what is the free pool" rule lives in ONE place.
CREATE OR REPLACE FUNCTION public.free_pool_ids(p_category TEXT, p_per_category INT DEFAULT 50)
RETURNS TABLE (id TEXT) AS $$
  SELECT q.id
  FROM public.questions q
  WHERE q.category = p_category
    AND q.verified = true
  ORDER BY q.id ASC
  LIMIT p_per_category;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_random_questions, now free-pool aware.
-- When p_free_only = true, random selection is drawn ONLY from free_pool_ids()
-- for that category; otherwise it samples the whole verified category.
CREATE OR REPLACE FUNCTION public.get_random_questions(
  p_category TEXT,
  p_limit INT,
  p_free_only BOOLEAN DEFAULT false
)
RETURNS TABLE (id TEXT) AS $$
BEGIN
  IF p_free_only THEN
    RETURN QUERY
      SELECT fp.id
      FROM public.free_pool_ids(p_category) fp
      ORDER BY random()
      LIMIT p_limit;
  ELSE
    RETURN QUERY
      SELECT q.id FROM public.questions q
      WHERE q.category = p_category AND q.verified = true
      ORDER BY random()
      LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_weak_spot_questions, now free-pool aware. (Blind-spot drilling is a Pro
-- feature so this branch is normally reached only by paid users; the guard is
-- defense-in-depth so a free caller can never source outside the 200.)
CREATE OR REPLACE FUNCTION public.get_weak_spot_questions(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25,
  p_free_only BOOLEAN DEFAULT false
)
RETURNS TABLE (id TEXT) AS $$
BEGIN
  RETURN QUERY
    WITH weak_subtopics AS (
      SELECT q.subtopic_id,
             ROUND(1.0 - (COUNT(*) FILTER (WHERE up.correct)::NUMERIC / COUNT(*)), 2) AS err
      FROM public.user_progress up
      JOIN public.questions q ON q.id = up.question_id
      WHERE up.user_id = p_user_id
        AND q.subtopic_id IS NOT NULL
        AND (p_category IS NULL OR q.category = p_category)
      GROUP BY q.subtopic_id
      HAVING COUNT(*) >= 2
        AND ROUND(1.0 - (COUNT(*) FILTER (WHERE up.correct)::NUMERIC / COUNT(*)), 2) >= 0.40
    ),
    -- Free pool across all four categories (only used when p_free_only).
    free_pool AS (
      SELECT id FROM public.free_pool_ids('Core')
      UNION ALL SELECT id FROM public.free_pool_ids('Type I')
      UNION ALL SELECT id FROM public.free_pool_ids('Type II')
      UNION ALL SELECT id FROM public.free_pool_ids('Type III')
    )
    SELECT q.id
    FROM public.questions q
    JOIN weak_subtopics ws ON ws.subtopic_id = q.subtopic_id
    WHERE q.verified = true
      AND (p_category IS NULL OR q.category = p_category)
      AND (NOT p_free_only OR q.id IN (SELECT id FROM free_pool))
    ORDER BY ws.err DESC, random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
