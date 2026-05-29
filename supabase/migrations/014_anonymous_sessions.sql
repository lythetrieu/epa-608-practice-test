-- Anonymous test sessions (guests without account)
create table if not exists anonymous_sessions (
  id            uuid primary key default gen_random_uuid(),
  anonymous_id  text not null,           -- cookie-based UUID
  category      text not null,
  score         int  not null,
  total         int  not null,
  started_at    timestamptz,
  submitted_at  timestamptz not null default now(),
  user_agent    text,
  country       text
);

create index if not exists anon_sessions_anon_id_idx  on anonymous_sessions(anonymous_id);
create index if not exists anon_sessions_submitted_idx on anonymous_sessions(submitted_at desc);
create index if not exists anon_sessions_category_idx  on anonymous_sessions(category);

-- Only service role can read/write (no RLS for public read)
alter table anonymous_sessions enable row level security;
create policy "service only" on anonymous_sessions using (false);
