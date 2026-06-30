-- AI Tutor server-side abuse guard (per IP, per day).
-- ADDITIVE ONLY — creates one new table; does NOT touch the question bank or any
-- existing data. Backs the IP rate-limit in supabase/functions/tutor/index.ts.

create table if not exists public.tutor_ip_usage (
  ip         text    not null,
  period_key text    not null,            -- 'YYYY-MM-DD' (UTC daily bucket)
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip, period_key)
);

-- No client access: only the service role (edge function) touches this table.
alter table public.tutor_ip_usage enable row level security;
revoke all on public.tutor_ip_usage from anon, authenticated;

-- Atomic upsert+increment; returns the new count. SECURITY DEFINER so the
-- edge function (service role) can call it via PostgREST rpc.
create or replace function public.tutor_ip_increment(p_ip text, p_period text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.tutor_ip_usage (ip, period_key, count, updated_at)
  values (p_ip, p_period, 1, now())
  on conflict (ip, period_key)
  do update set count = public.tutor_ip_usage.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.tutor_ip_increment(text, text) from anon, authenticated;
