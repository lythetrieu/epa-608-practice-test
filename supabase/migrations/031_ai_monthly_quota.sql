-- 031: AI Tutor monthly quota (free 10/mo, Pro 1,000/mo) — replaces daily counting.
-- Old columns ai_queries_today / ai_queries_reset_at are KEPT (legacy fallback path
-- in code still reads them until this migration is confirmed live). Drop later in 032.

alter table public.users_profile
  add column if not exists ai_queries_month integer not null default 0,
  add column if not exists ai_queries_month_key text not null default '';

-- Atomic month-rollover + increment in one statement (race-free).
-- Returns rejected=true when the user is already AT the limit for this month.
create or replace function public.increment_ai_usage_monthly(p_user_id uuid, p_limit integer)
returns table (rejected boolean, new_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := to_char(timezone('utc', now()), 'YYYY-MM');
  v_count integer;
begin
  update public.users_profile
     set ai_queries_month = case when ai_queries_month_key = v_key then ai_queries_month + 1 else 1 end,
         ai_queries_month_key = v_key
   where id = p_user_id
     and (case when ai_queries_month_key = v_key then ai_queries_month else 0 end) < p_limit
  returning ai_queries_month into v_count;

  if v_count is null then
    -- no row updated: user missing OR limit reached — treat as rejected
    return query select true, p_limit;
  else
    return query select false, v_count;
  end if;
end;
$$;

-- Called only via the service-role admin client from API routes.
revoke all on function public.increment_ai_usage_monthly(uuid, integer) from public;
revoke all on function public.increment_ai_usage_monthly(uuid, integer) from anon;
revoke all on function public.increment_ai_usage_monthly(uuid, integer) from authenticated;
