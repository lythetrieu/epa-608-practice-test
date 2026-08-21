-- Admin analytics counted the CI robots as students.
--
-- The e2e personas replay the user journey several times a day, and the
-- journey always opens Type I and answers at random. That single free
-- persona has written 26,040 user_progress rows at 31% accuracy, against
-- 920 rows from the 17 real students who ever opened Type I. Every figure
-- built on user_progress was therefore describing a robot: "Most Failed
-- Questions" was five Type I questions with ~500 fails each, none of which
-- a human had failed more than a handful of times.
--
-- Both analytics RPCs now exclude the test domain. Nothing else reads these
-- functions, and the personas keep their rows so the suite still asserts
-- against them.

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
    JOIN public.users_profile p ON p.id = up.user_id
    WHERE up.correct = false
      AND COALESCE(p.email, '') NOT LIKE '%@epa608-test.local'
    GROUP BY up.question_id
    ORDER BY fails DESC
    LIMIT p_limit
  ) cnt
  JOIN public.questions q ON q.id = cnt.question_id
  ORDER BY cnt.fails DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_summary(
  p_week_ago TIMESTAMPTZ,
  p_month_ago TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tier_free',      (SELECT COUNT(*) FROM public.users_profile
                         WHERE tier = 'free' AND COALESCE(email,'') NOT LIKE '%@epa608-test.local'),
    'tier_starter',   (SELECT COUNT(*) FROM public.users_profile
                         WHERE tier = 'starter' AND COALESCE(email,'') NOT LIKE '%@epa608-test.local'),
    'tier_ultimate',  (SELECT COUNT(*) FROM public.users_profile
                         WHERE tier = 'ultimate' AND COALESCE(email,'') NOT LIKE '%@epa608-test.local'),
    'active_7d',      (SELECT COUNT(DISTINCT s.user_id) FROM public.test_sessions s
                         JOIN public.users_profile p ON p.id = s.user_id
                         WHERE s.submitted_at IS NOT NULL AND s.submitted_at >= p_week_ago
                           AND COALESCE(p.email,'') NOT LIKE '%@epa608-test.local'),
    'active_30d',     (SELECT COUNT(DISTINCT s.user_id) FROM public.test_sessions s
                         JOIN public.users_profile p ON p.id = s.user_id
                         WHERE s.submitted_at IS NOT NULL AND s.submitted_at >= p_month_ago
                           AND COALESCE(p.email,'') NOT LIKE '%@epa608-test.local'),
    'unique_anon',    (SELECT COUNT(DISTINCT anonymous_id) FROM public.anonymous_sessions),
    'ai_total_today', (SELECT COALESCE(SUM(ai_queries_today), 0) FROM public.users_profile
                         WHERE COALESCE(email,'') NOT LIKE '%@epa608-test.local'),
    'ai_users_today', (SELECT COUNT(*) FROM public.users_profile
                         WHERE ai_queries_today > 0 AND COALESCE(email,'') NOT LIKE '%@epa608-test.local')
  );
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.top_failed_questions(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.top_failed_questions(INT) TO service_role, authenticated;
