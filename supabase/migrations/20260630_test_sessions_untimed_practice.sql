-- Allow untimed (practice) test sessions.
--
-- Practice mode and timed mode now share ONE session+submit pipeline. Practice
-- sessions are untimed. The application stores untimed sessions with
-- time_limit_secs = 0 (sentinel) which already works on the existing NOT NULL
-- column, so the app does NOT require this migration to function. This migration
-- simply relaxes the constraint so a NULL time limit can be stored as a clearer
-- representation of "untimed" going forward. Code treats BOTH 0 and NULL as
-- untimed, so applying this migration is non-breaking either way.

ALTER TABLE public.test_sessions
  ALTER COLUMN time_limit_secs DROP NOT NULL;
