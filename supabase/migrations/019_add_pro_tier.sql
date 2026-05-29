-- Add 'pro' as a valid tier value
-- Previous tiers 'starter'/'ultimate' remain valid for backward compat (existing users)

ALTER TABLE public.users_profile
  DROP CONSTRAINT IF EXISTS users_profile_tier_check;

ALTER TABLE public.users_profile
  ADD CONSTRAINT users_profile_tier_check
  CHECK (tier IN ('free', 'starter', 'ultimate', 'pro'));

-- Update pending_upgrades default
ALTER TABLE public.pending_upgrades
  ALTER COLUMN tier SET DEFAULT 'pro';
