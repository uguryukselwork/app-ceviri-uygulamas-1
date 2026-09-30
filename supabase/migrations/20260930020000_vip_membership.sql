-- VIP membership: gifts and purchase requests approved by the admin, promo codes, and an app-wide VIP switch.
-- VIP unlocks the paid voice engine (Gemini Live); live-token checks it server-side.

-- 'members': only VIP members get the paid engine; 'everyone': VIP is free for all; 'off': free engine only
delete from public.app_settings where key = 'voice_mode';
insert into public.app_settings (key, value) values ('vip_access', '"members"');
drop function public.admin_set_voice_mode(text, text);

create table public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vip_until timestamptz,
  plan text,
  updated_at timestamptz not null default now()
);
alter table public.memberships enable row level security;
create policy "users read own membership" on public.memberships
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.memberships from anon;
revoke insert, update, delete on public.memberships from authenticated;

create table public.vip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null check (char_length(user_name) between 1 and 64),
  kind text not null check (kind in ('gift', 'purchase')),
  plan text check (plan is null or plan ~ '^vip(100|200|300):(weekly|monthly|yearly)$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index vip_requests_one_pending on public.vip_requests (user_id) where status = 'pending';
create index vip_requests_created_idx on public.vip_requests (created_at desc);
alter table public.vip_requests enable row level security;
create policy "users read own requests" on public.vip_requests
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.vip_requests from anon;
revoke insert, update, delete on public.vip_requests from authenticated;

-- The app shows "VIP üyelik atandı" the moment the admin approves
alter publication supabase_realtime add table public.memberships;
alter publication supabase_realtime add table public.vip_requests;

create table private.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,16}$'),
  days int not null check (days between 1 and 3650),
  max_uses int not null check (max_uses between 1 and 100000),
  uses int not null default 0,
  created_at timestamptz not null default now()
);
create table private.promo_redemptions (
  code text not null references private.promo_codes(code) on delete cascade,
  user_id uuid not null,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);
create table private.promo_attempts (
  user_id uuid,
  at timestamptz not null default now()
);
create index promo_attempts_at_idx on private.promo_attempts (at);

-- Extends VIP by p_days from now, or from the current end date if still VIP
create function private.grant_vip(p_user uuid, p_days int, p_plan text)
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  insert into public.memberships as m (user_id, vip_until, plan, updated_at)
  values (p_user, now() + make_interval(days => p_days), p_plan, now())
  on conflict (user_id) do update
    set vip_until = greatest(coalesce(m.vip_until, now()), now()) + make_interval(days => p_days),
        plan = coalesce(p_plan, m.plan),
        updated_at = now()
  returning vip_until;
$$;

-- Result: {status: ok | invalid | used_up | already_used, vip_until?}
create function public.redeem_promo_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  promo private.promo_codes;
  until timestamptz;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if (select count(*) from private.promo_attempts where user_id = uid and at > now() - interval '15 minutes') >= 10 then
    raise exception 'too_many_attempts';
  end if;

  select * into promo from private.promo_codes where code = upper(trim(p_code)) for update;
  if not found then
    insert into private.promo_attempts (user_id) values (uid);
    return jsonb_build_object('status', 'invalid');
  end if;
  if exists (select 1 from private.promo_redemptions where code = promo.code and user_id = uid) then
    return jsonb_build_object('status', 'already_used');
  end if;
  if promo.uses >= promo.max_uses then
    return jsonb_build_object('status', 'used_up');
  end if;

  insert into private.promo_redemptions (code, user_id) values (promo.code, uid);
  update private.promo_codes set uses = uses + 1 where code = promo.code;
  until := private.grant_vip(uid, promo.days, 'promo');
  return jsonb_build_object('status', 'ok', 'vip_until', until);
end;
$$;

-- Result: sent | already_pending
create function public.request_vip(p_kind text, p_plan text, p_name text)
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
  if exists (select 1 from public.vip_requests where user_id = uid and status = 'pending') then
    return 'already_pending';
  end if;
  insert into public.vip_requests (user_id, user_name, kind, plan)
  values (uid, left(coalesce(nullif(trim(p_name), ''), 'Misafir'), 64), p_kind,
          case when p_kind = 'purchase' then p_plan end);
  return 'sent';
end;
$$;

-- Everything the admin panel shows; null for a wrong PIN
create function public.admin_overview(p_pin text)
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
    ), '[]'::jsonb)
  );
end;
$$;

create function public.admin_set_vip_access(p_pin text, p_value text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_value not in ('members', 'everyone', 'off') then raise exception 'invalid_value'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  update public.app_settings set value = to_jsonb(p_value), updated_at = now() where key = 'vip_access';
  return true;
end;
$$;

create function public.admin_create_promo(p_pin text, p_code text, p_days int, p_max_uses int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.admin_check_pin(p_pin) then return false; end if;
  insert into private.promo_codes (code, days, max_uses) values (upper(trim(p_code)), p_days, p_max_uses);
  return true;
exception when unique_violation then
  raise exception 'code_exists';
end;
$$;

create function public.admin_delete_promo(p_pin text, p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.admin_check_pin(p_pin) then return false; end if;
  delete from private.promo_codes where code = p_code;
  return true;
end;
$$;

-- Approve (granting p_days of VIP) or reject a pending request
create function public.admin_decide_request(p_pin text, p_id uuid, p_approve boolean, p_days int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  req public.vip_requests;
begin
  if not public.admin_check_pin(p_pin) then return false; end if;
  select * into req from public.vip_requests where id = p_id and status = 'pending' for update;
  if not found then raise exception 'request_not_pending'; end if;
  if p_approve then
    if p_days is null or p_days < 1 or p_days > 3650 then raise exception 'invalid_days'; end if;
    perform private.grant_vip(req.user_id, p_days, coalesce(req.plan, 'gift'));
  end if;
  update public.vip_requests
    set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
    where id = p_id;
  return true;
end;
$$;

revoke execute on function private.grant_vip(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.redeem_promo_code(text) from public, anon;
revoke execute on function public.request_vip(text, text, text) from public, anon;
revoke execute on function public.admin_overview(text) from public, anon;
revoke execute on function public.admin_set_vip_access(text, text) from public, anon;
revoke execute on function public.admin_create_promo(text, text, int, int) from public, anon;
revoke execute on function public.admin_delete_promo(text, text) from public, anon;
revoke execute on function public.admin_decide_request(text, uuid, boolean, int) from public, anon;
grant execute on function public.redeem_promo_code(text) to authenticated;
grant execute on function public.request_vip(text, text, text) to authenticated;
grant execute on function public.admin_overview(text) to authenticated;
grant execute on function public.admin_set_vip_access(text, text) to authenticated;
grant execute on function public.admin_create_promo(text, text, int, int) to authenticated;
grant execute on function public.admin_delete_promo(text, text) to authenticated;
grant execute on function public.admin_decide_request(text, uuid, boolean, int) to authenticated;
