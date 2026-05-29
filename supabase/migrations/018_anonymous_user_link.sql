-- Migration: Link anonymous sessions to authenticated users
-- Run this in the Supabase SQL Editor for project sequvmxgtmbirnixeril

-- 1. Add user_id column to anonymous_sessions (nullable — anon rows stay NULL)
ALTER TABLE public.anonymous_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Index for fast look-ups by user
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_user_id
  ON public.anonymous_sessions (user_id)
  WHERE user_id IS NOT NULL;

-- 3. Index for look-ups by anonymous_id (already useful for the migration query)
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_anonymous_id
  ON public.anonymous_sessions (anonymous_id);
