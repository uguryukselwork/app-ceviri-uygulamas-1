-- App-wide settings (currently the voice translation mode) that only the admin can change.
-- Opened in the app by tapping the logo 5 times; the PIN is checked here, never in the browser.

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy "signed-in users read settings" on public.app_settings
  for select to authenticated using (true);
revoke all on public.app_settings from anon;
revoke insert, update, delete on public.app_settings from authenticated;

-- 'free': browser speech recognition + text translation + spoken reply (no cost)
-- 'paid': Gemini Live speech-to-speech translation (billed per minute)
insert into public.app_settings (key, value) values ('voice_mode', '"free"');

-- Not exposed through the API
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Single row holding the bcrypt hash of the admin PIN.
-- The PIN itself is set outside of migrations so it never lands in git:
--   insert into private.admin_config (pin_hash) values (extensions.crypt('<PIN>', extensions.gen_salt('bf')));
create table private.admin_config (
  id int primary key default 1 check (id = 1),
  pin_hash text not null
);

-- Failed PIN attempts, for lockout (a 4-digit PIN is otherwise guessable)
create table private.admin_attempts (
  user_id uuid,
  at timestamptz not null default now()
);
create index admin_attempts_at_idx on private.admin_attempts (at);

-- true when the PIN is right; false (and counted) when wrong; error when locked out
create function public.admin_check_pin(p_pin text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ok boolean;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if (select count(*) from private.admin_attempts where user_id = uid and at > now() - interval '15 minutes') >= 5
     or (select count(*) from private.admin_attempts where at > now() - interval '15 minutes') >= 30 then
    raise exception 'too_many_attempts';
  end if;
  select exists (
    select 1 from private.admin_config c where c.pin_hash = extensions.crypt(p_pin, c.pin_hash)
  ) into ok;
  if not ok then
    insert into private.admin_attempts (user_id) values (uid);
  end if;
  return ok;
end;
$$;

-- Returns false for a wrong PIN (so the failed attempt is still recorded)
create function public.admin_set_voice_mode(p_pin text, p_mode text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_mode not in ('free', 'paid') then
    raise exception 'invalid_mode';
  end if;
  if not public.admin_check_pin(p_pin) then
    return false;
  end if;
  insert into public.app_settings (key, value, updated_at)
  values ('voice_mode', to_jsonb(p_mode), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return true;
end;
$$;

revoke execute on function public.admin_check_pin(text) from public, anon;
revoke execute on function public.admin_set_voice_mode(text, text) from public, anon;
grant execute on function public.admin_check_pin(text) to authenticated;
grant execute on function public.admin_set_voice_mode(text, text) to authenticated;
