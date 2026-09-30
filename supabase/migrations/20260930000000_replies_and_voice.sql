-- Replies (swipe / "Yanıtla") and messages spoken through live voice translation.
alter table public.messages
  add column reply_to_id uuid references public.messages(id) on delete set null,
  add column is_voice boolean not null default false;
