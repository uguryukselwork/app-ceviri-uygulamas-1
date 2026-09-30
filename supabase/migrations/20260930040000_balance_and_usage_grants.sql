-- Account balance (USD) the admin can top up, and usage time (hours of VIP) the admin sends to a user.
-- Users can only request weekly/monthly/yearly packages themselves.

alter table public.memberships add column balance_usd numeric(10, 2) not null default 0 check (balance_usd >= 0);

-- Purchase requests: weekly, monthly or yearly packages only
create or replace function public.request_vip(p_kind text, p_plan text, p_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_kind = 'purchase' and (p_plan is null or p_plan !~ '^(standard|premium):(weekly|monthly|yearly)$') then
    raise exception 'invalid_plan';
  end if;
  if exists (select 1 from public.vip_requests where user_id = uid and status = 'pending') then
    return 'already_pending';
  end if;
  insert into public.vip_requests (user_id, user_name, kind, plan)
  values (uid, left(coalesce(nullif(trim(p_name), ''), 'Misafir'), 64), p_kind,
          case when p_kind = 'purchase' then p_plan end);
  return 'sent';
end;
$$;

-- Everything the admin panel shows; null for a wrong PIN. Adds the user list with VIP end and balance.
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
        'balance_usd', coalesce(m.balance_usd, 0)
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

-- Adds (or with a negative amount, removes) dollars from a user's balance
create function public.admin_add_balance(p_pin text, p_user uuid, p_amount numeric)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000 then raise exception 'invalid_amount'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  insert into public.memberships as m (user_id, balance_usd, updated_at)
  values (p_user, greatest(round(p_amount, 2), 0), now())
  on conflict (user_id) do update
    set balance_usd = greatest(m.balance_usd + round(p_amount, 2), 0), updated_at = now();
  return true;
end;
$$;

-- Sends p_hours of VIP usage (e.g. 1 or 2 hours), extending any running membership
create function public.admin_grant_hours(p_pin text, p_user uuid, p_hours int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_hours is null or p_hours < 1 or p_hours > 8760 then raise exception 'invalid_hours'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  insert into public.memberships as m (user_id, vip_until, plan, updated_at)
  values (p_user, now() + make_interval(hours => p_hours), 'usage', now())
  on conflict (user_id) do update
    set vip_until = greatest(coalesce(m.vip_until, now()), now()) + make_interval(hours => p_hours),
        plan = 'usage',
        updated_at = now();
  return true;
end;
$$;

revoke execute on function public.admin_add_balance(text, uuid, numeric) from public, anon;
revoke execute on function public.admin_grant_hours(text, uuid, int) from public, anon;
grant execute on function public.admin_add_balance(text, uuid, numeric) to authenticated;
grant execute on function public.admin_grant_hours(text, uuid, int) to authenticated;
