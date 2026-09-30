-- Usage rights become a talk-time counter: the admin sends hours, and they run down only while the user
-- is in a VIP voice call. Users can also buy a package from their balance.

alter table public.memberships add column vip_seconds int not null default 0 check (vip_seconds >= 0);

-- The admin sends p_hours of VIP talk time (added to the counter)
create or replace function public.admin_grant_hours(p_pin text, p_user uuid, p_hours int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_hours is null or p_hours < 1 or p_hours > 8760 then raise exception 'invalid_hours'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  insert into public.memberships as m (user_id, vip_seconds, updated_at)
  values (p_user, p_hours * 3600, now())
  on conflict (user_id) do update
    set vip_seconds = m.vip_seconds + p_hours * 3600, updated_at = now();
  return true;
end;
$$;

-- Called by the app every few seconds of a VIP call. Returns the talk time left in seconds,
-- or -1 when the call is not metered (VIP package active, or VIP open to everyone).
create function public.consume_vip_seconds(p_seconds int)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m public.memberships;
  left_seconds int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if (select value #>> '{}' from public.app_settings where key = 'vip_access') = 'everyone' then return -1; end if;
  select * into m from public.memberships where user_id = uid for update;
  if not found then return 0; end if;
  if m.vip_until > now() then return -1; end if;
  update public.memberships
    set vip_seconds = greatest(vip_seconds - least(greatest(coalesce(p_seconds, 0), 0), 60), 0), updated_at = now()
    where user_id = uid
    returning vip_seconds into left_seconds;
  return left_seconds;
end;
$$;

-- Package prices in USD and length in days. Keep in sync with src/lib/plans.ts.
create function private.plan_price(p_plan text, out price numeric, out days int)
language sql
immutable
set search_path = ''
as $$
  select v.price, v.days from (values
    ('standard:weekly', 6.99, 7), ('standard:monthly', 19.99, 30), ('standard:yearly', 199.99, 365),
    ('premium:weekly', 10.49, 7), ('premium:monthly', 29.99, 30), ('premium:yearly', 299.99, 365)
  ) as v(plan, price, days)
  where v.plan = p_plan;
$$;

-- Buys a package with the balance: 'ok', 'insufficient' or 'invalid_plan'
create function public.buy_with_balance(p_plan text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p record;
  balance numeric;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into p from private.plan_price(p_plan);
  if p.price is null then return 'invalid_plan'; end if;
  select balance_usd into balance from public.memberships where user_id = uid for update;
  if coalesce(balance, 0) < p.price then return 'insufficient'; end if;
  update public.memberships set balance_usd = balance_usd - p.price where user_id = uid;
  perform private.grant_vip(uid, p.days, p_plan);
  return 'ok';
end;
$$;

-- Users list in the admin panel also shows the talk time left
create or replace function public.admin_overview(p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.admin_check_pin(p_pin) then return null; end if;
  return jsonb_build_object(
    'vip_access', (select value from public.app_settings where key = 'vip_access'),
    'vip_members', (select count(*) from public.memberships where vip_until > now()),
    'requests', coalesce((
      select jsonb_agg(to_jsonb(r) order by (r.status <> 'pending'), r.created_at desc)
      from (select * from public.vip_requests order by (status <> 'pending'), created_at desc limit 50) r
    ), '[]'::jsonb),
    'promos', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc) from private.promo_codes p
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', u.user_id, 'name', u.name, 'last_seen', u.last_seen,
        'vip_until', case when m.vip_until > now() then m.vip_until end,
        'balance_usd', coalesce(m.balance_usd, 0),
        'vip_seconds', coalesce(m.vip_seconds, 0)
      ) order by u.last_seen desc)
      from (
        select distinct on (user_id) user_id, name, last_seen
        from (
          select user_id, name, last_seen from public.participants
          union all
          select user_id, user_name, created_at from public.vip_requests
        ) seen
        order by user_id, last_seen desc
      ) u
      left join public.memberships m on m.user_id = u.user_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function private.plan_price(text) from public, anon, authenticated;
revoke execute on function public.consume_vip_seconds(int) from public, anon;
revoke execute on function public.buy_with_balance(text) from public, anon;
grant execute on function public.consume_vip_seconds(int) to authenticated;
grant execute on function public.buy_with_balance(text) to authenticated;
