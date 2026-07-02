-- ─────────────────────────────────────────────────────────────────────────────
-- 014_ai_chat_update_with_check.sql
-- SECURITY FIX: the `ai_chat_update_own` policy (007) had a USING clause but no
-- WITH CHECK. USING blocks updating rows you don't own, but the missing
-- WITH CHECK let a user reassign user_id on their OWN row to another user
-- (row-hijack) or write a row under a changed owner. Every other table follows
-- the `*_update_own` pattern with WITH CHECK — this brings ai_chat_sessions in line.
--
-- The app was also hardened to scope the update by user_id (defense-in-depth),
-- but the policy is the real guarantee.
--
-- Rollback: recreate the policy with only the USING clause (as in 007).
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "ai_chat_update_own" ON public.ai_chat_sessions;

CREATE POLICY "ai_chat_update_own" ON public.ai_chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
