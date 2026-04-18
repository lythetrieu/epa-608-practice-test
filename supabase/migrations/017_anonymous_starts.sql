create table if not exists anonymous_starts (
  id           uuid primary key default gen_random_uuid(),
  anonymous_id text not null,
  category     text not null,
  started_at   timestamptz not null default now()
);

create index if not exists anon_starts_anon_id_idx  on anonymous_starts(anonymous_id);
create index if not exists anon_starts_started_idx  on anonymous_starts(started_at desc);
create index if not exists anon_starts_category_idx on anonymous_starts(category);

alter table anonymous_starts enable row level security;
create policy "service only" on anonymous_starts using (false);
