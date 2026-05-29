-- Stores purchases made before account creation
-- Applied when user signs up with matching email
create table if not exists pending_upgrades (
  email      text primary key,
  tier       text not null default 'starter',
  ls_order_id text,
  created_at timestamptz not null default now()
);

alter table pending_upgrades enable row level security;
-- Only service role can read/write
create policy "service only" on pending_upgrades using (false);

-- Function: apply pending upgrade on user signup
create or replace function apply_pending_upgrade()
returns trigger language plpgsql security definer as $$
declare
  pending record;
begin
  select * into pending
  from pending_upgrades
  where email = lower(new.email)
  limit 1;

  if found then
    update users_profile
    set tier = pending.tier, lifetime_access = true
    where id = new.id;

    delete from pending_upgrades where email = lower(new.email);
  end if;

  return new;
end;
$$;

-- Trigger fires after new user row in auth.users
create or replace trigger on_auth_user_created_apply_upgrade
  after insert on auth.users
  for each row execute procedure apply_pending_upgrade();
