-- Migration 019 may have left duplicate or conflicting constraints.
-- Drop ALL constraints on users_profile.tier and re-add cleanly.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.users_profile'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%tier%'
  LOOP
    EXECUTE 'ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.users_profile
  ADD CONSTRAINT users_profile_tier_check
  CHECK (tier IN ('free', 'starter', 'ultimate', 'pro'));
