-- ============================================================================
-- 029_weak_spots_by_category.sql
-- Đợt 2 perf: /api/progress/weak-spots previously pulled up to 5000
-- user_progress rows (joined to questions) into Node and grouped by category
-- in JS. This RPC does the GROUP BY category in Postgres and returns one row
-- per category with {category, wrong, total}.
--
-- Semantics kept IDENTICAL to the route's in-JS logic:
--   * category falls back to 'Core' when questions.category is NULL
--   * a row is "wrong" when user_progress.correct = false
--   * (the >= 2 total filter + errorPct rounding stays in the route, so the
--      output shape/thresholds are byte-for-byte the same)
--
-- Mirrors the existing get_blind_spots RPC (SECURITY DEFINER, joins
-- user_progress -> questions).
--
-- SAFE-DEPLOY: the route tries this RPC first and, on ANY error (e.g. function
-- not present yet), falls back to the original 5000-row query. Shipping the
-- code before this migration runs is safe.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.weak_spots_by_category(
  p_user_id UUID
)
RETURNS TABLE (
  category TEXT,
  wrong    BIGINT,
  total    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(q.category, ''), 'Core')       AS category,
    COUNT(*) FILTER (WHERE up.correct = false)::BIGINT AS wrong,
    COUNT(*)::BIGINT                                AS total
  FROM public.user_progress up
  JOIN public.questions q ON q.id = up.question_id
  WHERE up.user_id = p_user_id
  GROUP BY COALESCE(NULLIF(q.category, ''), 'Core');
$$;

REVOKE ALL ON FUNCTION public.weak_spots_by_category(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.weak_spots_by_category(UUID) TO service_role, authenticated;

-- ── Verification (run manually after apply) ─────────────────────────────────
-- SELECT * FROM public.weak_spots_by_category('<some-user-uuid>');
