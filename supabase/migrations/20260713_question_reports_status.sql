-- ── question_reports: add resolution workflow ────────────────────────────────
-- Before: "pending" = simply "row exists" → the only way to clear the admin badge
--         was to DELETE the report, losing the record. This adds a status so a
--         report can be marked resolved/dismissed while keeping the history.

ALTER TABLE public.question_reports
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_note  TEXT NULL;

-- Fast path for the admin "pending count" and pending list.
CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON public.question_reports (status, created_at DESC);

-- Keep resolved_at consistent with status automatically.
CREATE OR REPLACE FUNCTION public.question_reports_touch_resolved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    NEW.resolved_at := NULL;
    NEW.resolved_by := NULL;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_touch_resolved ON public.question_reports;
CREATE TRIGGER trg_reports_touch_resolved
  BEFORE UPDATE ON public.question_reports
  FOR EACH ROW EXECUTE FUNCTION public.question_reports_touch_resolved();

-- Existing rows keep the default 'pending'. Backfill is intentionally a no-op:
-- every current report is genuinely still unreviewed.
