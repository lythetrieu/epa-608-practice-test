-- AI Tutor server-side usage tracking (per user, per period).
-- Backs the auth + rate-limit added to supabase/functions/tutor/index.ts.

create table if not exists public.tutor_usage (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  period_key text    not null,            -- 'YYYY-MM-DD' (daily) or 'YYYY-MM' (monthly)
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period_key)
);

-- No client access: only the service role (edge function) touches this table.
alter table public.tutor_usage enable row level security;
revoke all on public.tutor_usage from anon, authenticated;

-- Atomic upsert+increment; returns the new count. SECURITY DEFINER so the
-- edge function (service role) can call it via PostgREST rpc.
create or replace function public.tutor_usage_increment(p_user uuid, p_period text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.tutor_usage (user_id, period_key, count, updated_at)
  values (p_user, p_period, 1, now())
  on conflict (user_id, period_key)
  do update set count = public.tutor_usage.count + 1, updated_at = now()
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.tutor_usage_increment(uuid, text) from anon, authenticated;
