-- ============================================================================
-- 028_admin_analytics_rpcs.sql
-- Đợt 2 perf: replace full-table scans in the admin analytics page with
-- SECURITY DEFINER aggregate RPCs. These compute rollups in Postgres instead
-- of pulling every row into the Node process to reduce in JS.
--
-- Semantics are kept IDENTICAL to the previous in-JS implementation:
--   * tier tally      -> COUNT(*) grouped by tier
--   * active 7d/30d   -> COUNT(DISTINCT user_id) over submitted test_sessions
--   * distinct anon   -> COUNT(DISTINCT anonymous_id) over anonymous_sessions
--   * top failed Qs   -> COUNT(*) of user_progress rows where correct=false,
--                        grouped by question_id, ordered desc, limited.
--
-- SECURITY: these are SECURITY DEFINER so they bypass RLS (the page already
-- uses the service-role admin client). The app layer still gates the page on
-- users_profile.is_admin BEFORE calling these, exactly as today. They only
-- return aggregate scalars / small ranked lists, never per-user PII.
--
-- SAFE-DEPLOY: the analytics page calls these with a graceful fallback to the
-- original per-row queries, so shipping the code before this migration runs is
-- safe — the page keeps working (slower) until these functions exist.
-- ============================================================================

-- ── Aggregate summary: tier tally + active users + distinct anon ────────────
-- p_week_ago / p_month_ago are passed from the app so the date-window math
-- stays in ONE place (the page) and matches the other count(head:true) queries.
CREATE OR REPLACE FUNCTION public.admin_analytics_summary(
  p_week_ago  TIMESTAMPTZ,
  p_month_ago TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tier_free',      (SELECT COUNT(*) FROM public.users_profile WHERE tier = 'free'),
    'tier_starter',   (SELECT COUNT(*) FROM public.users_profile WHERE tier = 'starter'),
    'tier_ultimate',  (SELECT COUNT(*) FROM public.users_profile WHERE tier = 'ultimate'),
    'active_7d',      (SELECT COUNT(DISTINCT user_id) FROM public.test_sessions
                         WHERE submitted_at IS NOT NULL AND submitted_at >= p_week_ago),
    'active_30d',     (SELECT COUNT(DISTINCT user_id) FROM public.test_sessions
                         WHERE submitted_at IS NOT NULL AND submitted_at >= p_month_ago),
    'unique_anon',    (SELECT COUNT(DISTINCT anonymous_id) FROM public.anonymous_sessions),
    -- total AI queries today = SUM(ai_queries_today); the reset job zeroes this daily
    'ai_total_today', (SELECT COALESCE(SUM(ai_queries_today), 0) FROM public.users_profile),
    'ai_users_today', (SELECT COUNT(*) FROM public.users_profile WHERE ai_queries_today > 0)
  );
$$;

-- ── Top-N most-failed questions ─────────────────────────────────────────────
-- Returns question_id + fail count + question text, joined in-DB, so the page
-- never pulls EVERY wrong-answer row (previously .eq('correct', false) unbounded).
CREATE OR REPLACE FUNCTION public.top_failed_questions(p_limit INT DEFAULT 5)
RETURNS TABLE (id TEXT, question TEXT, fails BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT q.id,
         q.question,
         cnt.fails
  FROM (
    SELECT up.question_id, COUNT(*) AS fails
    FROM public.user_progress up
    WHERE up.correct = false
    GROUP BY up.question_id
    ORDER BY fails DESC
    LIMIT p_limit
  ) cnt
  JOIN public.questions q ON q.id = cnt.question_id
  ORDER BY cnt.fails DESC;
$$;

-- Lock down: only service_role / authenticated (page uses service role) execute.
REVOKE ALL ON FUNCTION public.admin_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.top_failed_questions(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.top_failed_questions(INT) TO service_role, authenticated;

-- ── Verification (run manually after apply) ─────────────────────────────────
-- SELECT public.admin_analytics_summary(now() - interval '7 days', now() - interval '30 days');
-- SELECT * FROM public.top_failed_questions(5);
