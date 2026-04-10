-- AI Tutor chat history (retained 30 days)
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'New conversation',
  messages    JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_user ON public.ai_chat_sessions(user_id, updated_at DESC);

-- RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_chat_select_own" ON public.ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_insert_own" ON public.ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_chat_update_own" ON public.ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_chat_delete_own" ON public.ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-delete chats older than 30 days (run via Supabase cron or pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_old_chats()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ai_chat_sessions WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
