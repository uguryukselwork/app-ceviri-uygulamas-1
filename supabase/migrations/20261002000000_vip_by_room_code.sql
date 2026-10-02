-- Promo codes are gone: the admin activates VIP by entering the user's room code instead.

drop function public.redeem_promo_code(text);
drop function public.admin_create_promo(text, text, int, int);
drop function public.admin_delete_promo(text, text);
drop table private.promo_attempts;
drop table private.promo_redemptions;
drop table private.promo_codes;

-- People in the room with this code, for the admin to pick whom to make VIP.
-- null when the PIN is wrong; raises room_not_found for an unknown code.
create function public.admin_room_members(p_pin text, p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  rid uuid;
begin
  if not public.admin_check_pin(p_pin) then return null; end if;
  select id into rid from public.rooms where code = upper(trim(p_code));
  if rid is null then raise exception 'room_not_found'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', p.user_id, 'name', p.name, 'last_seen', p.last_seen,
      'vip_until', case when m.vip_until > now() then m.vip_until end
    ) order by p.last_seen desc)
    from public.participants p
    left join public.memberships m on m.user_id = p.user_id
    where p.room_id = rid
  ), '[]'::jsonb);
end;
$$;

-- Gives p_days of VIP (added to any VIP time left)
create function public.admin_grant_vip(p_pin text, p_user uuid, p_days int)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_days is null or p_days < 1 or p_days > 3650 then raise exception 'invalid_days'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  perform private.grant_vip(p_user, p_days, 'gift');
  return true;
end;
$$;

-- Same overview, without promo codes
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

revoke execute on function public.admin_room_members(text, text) from public, anon;
revoke execute on function public.admin_grant_vip(text, uuid, int) from public, anon;
grant execute on function public.admin_room_members(text, text) to authenticated;
grant execute on function public.admin_grant_vip(text, uuid, int) to authenticated;
