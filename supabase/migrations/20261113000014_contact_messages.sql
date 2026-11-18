-- 14. Contact page messages
-- Rows are written only by the contact-message Edge Function (service role).

create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 120),
  email       text not null check (length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+$'),
  subject     text not null check (length(btrim(subject)) between 1 and 150),
  message     text not null check (length(btrim(message)) between 1 and 3000),
  status      text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  staff_note  text check (staff_note is null or length(staff_note) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create trigger contact_messages_set_updated_at before update on public.contact_messages
  for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;

-- No insert policy: messages are written only by the contact-message Edge Function.
create policy "contact_messages: support staff read"
  on public.contact_messages for select
  using (public.has_role('owner', 'order_manager'));

create policy "contact_messages: support staff update"
  on public.contact_messages for update
  using (public.has_role('owner', 'order_manager'))
  with check (public.has_role('owner', 'order_manager'));

create policy "contact_messages: owner delete"
  on public.contact_messages for delete
  using (public.has_role('owner'));

-- Staff can change only the status and their own note, never the customer's words.
revoke all on public.contact_messages from anon, authenticated;
grant select, delete on public.contact_messages to authenticated;
grant update (status, staff_note) on public.contact_messages to authenticated;
