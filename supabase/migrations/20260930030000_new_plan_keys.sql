-- Plans were renamed to standard/premium with hourly and daily periods ('standard:yearly').
-- Old keys ('vip200:monthly') stay valid for existing requests.
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.vip_requests'::regclass and contype = 'c'
    and pg_get_constraintdef(oid) like '%plan%';
  if c is not null then execute format('alter table public.vip_requests drop constraint %I', c); end if;
end $$;

alter table public.vip_requests add constraint vip_requests_plan_check check (
  plan is null
  or plan ~ '^(standard|premium):(hourly|daily|weekly|monthly|yearly)$'
  or plan ~ '^vip(100|200|300):(weekly|monthly|yearly)$'
);

-- Approve (granting p_days of VIP, or one hour for an hourly plan) or reject a pending request
create or replace function public.admin_decide_request(p_pin text, p_id uuid, p_approve boolean, p_days int)
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
    if req.plan like '%:hourly' then
      insert into public.memberships as m (user_id, vip_until, plan, updated_at)
      values (req.user_id, now() + interval '1 hour', req.plan, now())
      on conflict (user_id) do update
        set vip_until = greatest(coalesce(m.vip_until, now()), now()) + interval '1 hour',
            plan = req.plan,
            updated_at = now();
    else
      if p_days is null or p_days < 1 or p_days > 3650 then raise exception 'invalid_days'; end if;
      perform private.grant_vip(req.user_id, p_days, coalesce(req.plan, 'gift'));
    end if;
  end if;
  update public.vip_requests
    set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
    where id = p_id;
  return true;
end;
$$;
