CREATE TABLE IF NOT EXISTS public.question_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES public.questions(id),
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_question ON public.question_reports(question_id);

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_own" ON public.question_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_select_own" ON public.question_reports
  FOR SELECT USING (auth.uid() = user_id);
