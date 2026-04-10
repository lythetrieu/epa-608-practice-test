-- Function to get random questions by category
-- Uses TABLESAMPLE for efficient random selection on large tables
CREATE OR REPLACE FUNCTION public.get_random_questions(p_category TEXT, p_limit INT)
RETURNS TABLE (id TEXT) AS $$
BEGIN
  RETURN QUERY
    SELECT q.id FROM public.questions q
    WHERE q.category = p_category AND q.verified = true
    ORDER BY random()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
