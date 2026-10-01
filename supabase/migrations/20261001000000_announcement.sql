-- A short note the admin shows to every user ("VIP üyelik şimdilik herkese bedava"), plus read access for
-- signed-out visitors so the home page can show it too. '' means no announcement.
insert into public.app_settings (key, value) values ('announcement', '""') on conflict (key) do nothing;

grant select on public.app_settings to anon;
create policy "visitors read public settings" on public.app_settings
  for select to anon using (key in ('vip_access', 'announcement'));

create function public.admin_set_announcement(p_pin text, p_text text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if char_length(coalesce(p_text, '')) > 280 then raise exception 'too_long'; end if;
  if not public.admin_check_pin(p_pin) then return false; end if;
  insert into public.app_settings (key, value, updated_at)
  values ('announcement', to_jsonb(trim(coalesce(p_text, ''))), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke execute on function public.admin_set_announcement(text, text) from public, anon;
grant execute on function public.admin_set_announcement(text, text) to authenticated;
