-- Allow public (unauthenticated) read access to questions table
-- Needed by the static site epa608practicetest.net which uses anon key directly
CREATE POLICY "questions_public_read" ON public.questions
  FOR SELECT
  TO anon
  USING (true);
