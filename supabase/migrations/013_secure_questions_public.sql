-- ─────────────────────────────────────────────────────────────────────────────
-- 013_secure_questions_public.sql
-- SECURITY FIX (CRITICAL): the previous policy `questions_public_read`
-- (012) granted anon `SELECT ... USING (true)` on the BASE questions table.
-- RLS is row-level, not column-level, so that exposed answer_text, explanation,
-- and source_ref for ALL questions to anyone holding the (public) anon key —
-- defeating every API route that strips answers for timed tests and the whole
-- free/Pro gating model.
--
-- Fix: drop the blanket base-table grant and expose ONLY safe columns through a
-- view. Every app + marketing read of questions already goes through a
-- service-role server endpoint (createAdminClient), so nothing in-app relies on
-- direct anon table access — verified before writing this migration.
--
-- Rollback: DROP VIEW public.questions_public; and re-create the 012 policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove the leaky blanket anon read on the base table.
DROP POLICY IF EXISTS "questions_public_read" ON public.questions;

-- 2. Safe, column-restricted public projection. No answer_text / explanation /
--    source_ref. Views run with the definer's rights by default (security_invoker
--    off), so anon can read these columns through the view even though the base
--    table now denies anon.
CREATE OR REPLACE VIEW public.questions_public AS
SELECT
  id,
  category,
  subtopic_id,
  question,
  options,
  difficulty,
  verified,
  created_at
FROM public.questions
WHERE verified = true;

-- 3. Grant read on the safe view only.
GRANT SELECT ON public.questions_public TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY after running (should return an error / zero answer columns for anon):
--   set role anon;
--   select answer_text from public.questions limit 1;   -- expect: permission denied / no rows
--   select id, question from public.questions_public limit 1;  -- expect: a row
--   reset role;
-- ─────────────────────────────────────────────────────────────────────────────
