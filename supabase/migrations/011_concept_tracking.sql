-- ============================================================================
-- 011: Concept-Level Tracking
-- Tracks ~80-100 concepts, links questions to concepts, and stores per-user
-- mastery data for Pro users.
-- ============================================================================

-- Concept definitions
CREATE TABLE IF NOT EXISTS public.concepts (
  id TEXT PRIMARY KEY,              -- e.g. 'ozone-destruction-mechanism'
  title TEXT NOT NULL,               -- e.g. 'How Chlorine Destroys Ozone'
  category TEXT NOT NULL,            -- 'Core', 'Type I', 'Type II', 'Type III'
  summary TEXT NOT NULL DEFAULT '',  -- ~200 word explanation
  key_numbers TEXT[] DEFAULT '{}',   -- specific numbers to remember
  exam_tip TEXT DEFAULT '',          -- quick exam strategy
  fact_count INT DEFAULT 0,          -- how many facts in this concept
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link questions to concepts
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS concept_id TEXT REFERENCES public.concepts(id);

-- Index for fast lookups of questions by concept
CREATE INDEX IF NOT EXISTS idx_questions_concept_id ON public.questions(concept_id);

-- Track user concept mastery (for Pro users)
CREATE TABLE IF NOT EXISTS public.user_concept_mastery (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.concepts(id) ON DELETE CASCADE,
  questions_seen INT DEFAULT 0,
  questions_correct INT DEFAULT 0,
  mastery_level NUMERIC DEFAULT 0,  -- 0 to 1
  last_tested TIMESTAMPTZ,
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_user ON public.user_concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_mastery_concept ON public.user_concept_mastery(concept_id);

-- RLS for concepts (publicly readable)
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read concepts" ON public.concepts FOR SELECT USING (true);

-- RLS for user_concept_mastery (users see only their own data)
ALTER TABLE public.user_concept_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own mastery" ON public.user_concept_mastery
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mastery" ON public.user_concept_mastery
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mastery" ON public.user_concept_mastery
  FOR UPDATE USING (auth.uid() = user_id);
