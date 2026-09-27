-- LiveTranslate: rooms, participants, messages with per-member access.
-- Applied to the Supabase project "LiveTranslate" (jcygdcsdgccxuixfocof).

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 64),
  gender text check (gender in ('male', 'female')),
  language text not null,
  avatar_url text,
  status text not null default 'online',
  last_seen timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_gender text,
  sender_avatar text,
  original_text text not null check (char_length(original_text) between 1 and 4000),
  translated_text text,
  original_language text,
  target_language text,
  translation_status text not null default 'pending' check (translation_status in ('pending', 'completed', 'error')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index messages_room_created_idx on public.messages (room_id, created_at);
create index participants_user_idx on public.participants (user_id);

-- Membership check used by the policies (security definer avoids policy recursion)
create function public.is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants
    where room_id = p_room_id and user_id = (select auth.uid())
  );
$$;

-- Look up a single room by its code (codes act as invites, so rooms are not listable)
create function public.find_room(p_code text)
returns table (id uuid, code text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.code, r.created_at from public.rooms r where r.code = upper(p_code);
$$;

revoke execute on function public.is_room_member(uuid) from public, anon;
revoke execute on function public.find_room(text) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.find_room(text) to authenticated;

alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.messages enable row level security;

-- rooms
create policy "members and creator can read room" on public.rooms
  for select to authenticated
  using (created_by = (select auth.uid()) or public.is_room_member(id));
create policy "signed-in users create rooms" on public.rooms
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- participants
create policy "members see room participants" on public.participants
  for select to authenticated
  using (public.is_room_member(room_id));
create policy "users join as themselves" on public.participants
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "users update own participant row" on public.participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- messages
create policy "members read messages" on public.messages
  for select to authenticated
  using (public.is_room_member(room_id));
create policy "members send own untranslated messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_room_member(room_id)
    and translation_status = 'pending'
    and translated_text is null
    and is_read = false
  );
create policy "members mark others' messages read" on public.messages
  for update to authenticated
  using (public.is_room_member(room_id) and sender_id <> (select auth.uid()))
  with check (public.is_room_member(room_id));

-- Clients may only flip is_read; translations are written by the translate edge function (service role)
revoke update on public.messages from anon, authenticated;
grant update (is_read) on public.messages to authenticated;
revoke all on public.rooms, public.participants, public.messages from anon;

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.participants;

-- Upsert (insert ... on conflict do update) also checks the SELECT policy on the new row,
-- so a user joining a room must be able to see their own participant row before they are a member.
drop policy "members see room participants" on public.participants;
create policy "members see room participants" on public.participants
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_room_member(room_id));
