-- Revert 019: restore original tier constraint, keep 'pro' only for existing rows
-- Do NOT remove 'pro' from constraint (admin users have tier='pro')
-- Just restore pending_upgrades default back to 'starter'

ALTER TABLE public.pending_upgrades
  ALTER COLUMN tier SET DEFAULT 'starter';
