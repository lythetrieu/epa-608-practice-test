-- Question Bank v2 — add columns for the new SkillCat formats.
-- Paste this ONCE into Supabase → SQL Editor → Run.
-- Safe & idempotent (IF NOT EXISTS). Does NOT touch existing data.

alter table public.questions add column if not exists question_type  text default 'single_choice';
alter table public.questions add column if not exists correct_answers jsonb;
alter table public.questions add column if not exists scoring         jsonb;
alter table public.questions add column if not exists source_quiz     text;
alter table public.questions add column if not exists memory_tip      text;
alter table public.questions add column if not exists exam_trick      text;

-- index to filter/group by module + type quickly
create index if not exists questions_source_quiz_idx on public.questions (source_quiz);
create index if not exists questions_qtype_idx        on public.questions (question_type);
