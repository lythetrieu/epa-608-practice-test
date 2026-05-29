-- Analyze user's weak subtopics based on answer history
CREATE OR REPLACE FUNCTION public.get_blind_spots(
  p_user_id UUID,
  p_min_attempts INT DEFAULT 3
)
RETURNS TABLE (
  subtopic_id TEXT,
  category TEXT,
  total_attempts BIGINT,
  correct_count BIGINT,
  error_rate NUMERIC,
  last_attempted TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      q.subtopic_id,
      q.category,
      COUNT(*)::BIGINT AS total_attempts,
      COUNT(*) FILTER (WHERE up.correct)::BIGINT AS correct_count,
      ROUND(1.0 - (COUNT(*) FILTER (WHERE up.correct)::NUMERIC / COUNT(*)), 2) AS error_rate,
      MAX(up.answered_at) AS last_attempted
    FROM public.user_progress up
    JOIN public.questions q ON q.id = up.question_id
    WHERE up.user_id = p_user_id
      AND q.subtopic_id IS NOT NULL
    GROUP BY q.subtopic_id, q.category
    HAVING COUNT(*) >= p_min_attempts
    ORDER BY error_rate DESC, total_attempts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get questions weighted toward user's weak subtopics
CREATE OR REPLACE FUNCTION public.get_weak_spot_questions(
  p_user_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25
)
RETURNS TABLE (id TEXT) AS $$
BEGIN
  RETURN QUERY
    WITH weak_subtopics AS (
      SELECT q.subtopic_id,
             ROUND(1.0 - (COUNT(*) FILTER (WHERE up.correct)::NUMERIC / COUNT(*)), 2) AS err
      FROM public.user_progress up
      JOIN public.questions q ON q.id = up.question_id
      WHERE up.user_id = p_user_id
        AND q.subtopic_id IS NOT NULL
        AND (p_category IS NULL OR q.category = p_category)
      GROUP BY q.subtopic_id
      HAVING COUNT(*) >= 2
        AND ROUND(1.0 - (COUNT(*) FILTER (WHERE up.correct)::NUMERIC / COUNT(*)), 2) >= 0.40
    )
    SELECT q.id
    FROM public.questions q
    JOIN weak_subtopics ws ON ws.subtopic_id = q.subtopic_id
    WHERE q.verified = true
      AND (p_category IS NULL OR q.category = p_category)
    ORDER BY ws.err DESC, random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
