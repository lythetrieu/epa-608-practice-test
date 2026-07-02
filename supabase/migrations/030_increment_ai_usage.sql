-- ============================================================================
-- 030_increment_ai_usage.sql
-- Security cleanup "Đợt A": make the daily AI usage counter race-free.
--
-- Before: src/app/api/ai/chat and ai/explain did a read-modify-write on
-- users_profile.ai_queries_today (read currentCount, then UPDATE +1). Two
-- concurrent requests both read the same currentCount and both incremented,
-- so the per-day cap could be overshot → wasted OpenRouter cost.
--
-- This RPC does the reset-check + cap-check + atomic increment in ONE
-- statement under a single row lock, and returns the NEW count (count AFTER
-- this request) plus a `rejected` flag when the cap was already hit.
--
-- Semantics kept IDENTICAL to the route's in-JS logic:
--   * "today" = midnight (UTC) of the current date, matching
--       new Date(now.toISOString().split('T')[0]) in the route.
--   * reset happens when ai_queries_reset_at < today → count restarts at 1
--     and reset_at is stamped to now (first request of the new day).
--   * when NOT resetting and old count >= p_limit → rejected, count unchanged.
--   * otherwise old count + 1.
--   * new_count returned is the value AFTER this request, so the route computes
--     remaining = max(0, p_limit - new_count) — byte-for-byte equal to the old
--     max(0, dailyLimit - currentCount - 1) where currentCount = new_count - 1.
--
-- SAFE-DEPLOY: the routes call this RPC first and, on ANY error (e.g. the
-- function not being present yet), fall back to the original read-modify-write
-- logic. Shipping the code before this migration runs is safe.
--
-- SECURITY DEFINER so it runs with the same privileges as the service-role
-- read-modify-write it replaces; the routes already gate auth/tier before
-- calling it, and it only touches the row for the passed user id.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_limit   INT
)
RETURNS TABLE (
  new_count INT,
  rejected  BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today       TIMESTAMPTZ := date_trunc('day', now() AT TIME ZONE 'UTC');
  v_reset_at    TIMESTAMPTZ;
  v_current     INT;
BEGIN
  -- Lock the profile row so concurrent requests serialize on the counter.
  SELECT ai_queries_reset_at, COALESCE(ai_queries_today, 0)
    INTO v_reset_at, v_current
    FROM users_profile
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    -- No profile row — surface as "rejected" with 0 so the caller can 404/handle.
    new_count := 0;
    rejected  := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- New day → reset counter to 1 (this request), stamp reset_at to now.
  IF v_reset_at IS NULL OR v_reset_at < v_today THEN
    UPDATE users_profile
       SET ai_queries_today = 1,
           ai_queries_reset_at = now()
     WHERE id = p_user_id;
    new_count := 1;
    rejected  := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Same day, cap already reached → reject, leave counter untouched.
  IF v_current >= p_limit THEN
    new_count := v_current;
    rejected  := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Same day, under cap → atomic increment.
  UPDATE users_profile
     SET ai_queries_today = v_current + 1
   WHERE id = p_user_id;
  new_count := v_current + 1;
  rejected  := FALSE;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, INT) TO service_role;
