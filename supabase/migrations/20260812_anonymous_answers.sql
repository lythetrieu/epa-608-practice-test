-- Per-question behaviour for NOT-signed-in users on the marketing test pages.
-- Session-level tracking (anonymous_starts / anonymous_sessions) says how many
-- ran and how they scored; this table says WHICH questions they got wrong, how
-- long each one took, and where the abandoners stopped.
--
-- question_id is nullable on purpose: it comes from a data-qid stamped into the
-- static markup by text-matching against this table — 1 of 300 baked questions
-- did not match and still deserves its timing row.

create table if not exists public.anonymous_answers (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  category text not null,
  question_id text references public.questions(id) on delete set null,
  position int not null check (position between 1 and 200),
  correct boolean not null,
  time_ms int check (time_ms between 0 and 600000),
  exam_total int not null check (exam_total between 1 and 200),
  answered_at timestamptz not null default now()
);

create index if not exists anonymous_answers_anon_idx on public.anonymous_answers (anonymous_id, answered_at);
create index if not exists anonymous_answers_question_idx on public.anonymous_answers (question_id);
create index if not exists anonymous_answers_time_idx on public.anonymous_answers (answered_at);

-- Service-role writes only (the API route). No anon/authenticated policies:
-- RLS on with no policy = deny, and the service role bypasses RLS.
alter table public.anonymous_answers enable row level security;
