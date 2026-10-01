-- ============================================================================
-- Doctor Cares — Phase 2 · 0005 · Conversations & messages (Realtime chat)
-- ============================================================================
-- Model:
--   conversations              — one row per doctor/patient pair
--   conversation_participants  — 2 rows per conversation (doctor + patient)
--   messages                   — one row per message
--
-- A conversation exists only when there IS a doctor-patient relationship
-- (they've booked an appointment or the doctor invited the patient). Enforced
-- by the create-conversation RPC in 0006 (and RLS below).
-- ============================================================================

create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  doctor_id     uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint conversations_distinct check (patient_id <> doctor_id),
  -- One conversation per (doctor, patient) pair.
  unique (patient_id, doctor_id)
);

create index if not exists conv_patient_idx on public.conversations(patient_id);
create index if not exists conv_doctor_idx  on public.conversations(doctor_id);
create index if not exists conv_last_msg_idx on public.conversations(last_message_at desc);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- Participants table lets us query "conversations I'm in" fast.
create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id)      on delete cascade,
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create index if not exists conv_part_user_idx on public.conversation_participants(user_id);

-- Messages --------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id)      on delete restrict,
  body            text not null check (char_length(body) between 1 and 4000),
  attachment_url  text,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conv_idx    on public.messages(conversation_id, created_at desc);
create index if not exists messages_sender_idx  on public.messages(sender_id);

-- On INSERT, bump the parent conversation's last_message_at so lists sort.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- Helper: is CURRENT user a participant of this conversation?
create or replace function public.is_conversation_participant(_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = _conversation_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- RPC: get_or_create_conversation --------------------------------------------
-- Ensures a conversation exists between the caller and the target user.
-- Only allowed if a doctor-patient relationship exists (appointment).
-- Returns the conversation id.
create or replace function public.get_or_create_conversation(_target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me_role   public.user_role;
  them_role public.user_role;
  patient   uuid;
  doctor    uuid;
  cid       uuid;
  has_rel   boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if _target_user is null or _target_user = auth.uid() then
    raise exception 'invalid target';
  end if;

  select role into me_role   from public.profiles where id = auth.uid();
  select role into them_role from public.profiles where id = _target_user;

  if me_role is null or them_role is null then
    raise exception 'profile not found';
  end if;

  -- Determine which is patient and which is doctor.
  if me_role = 'patient' and them_role = 'doctor' then
    patient := auth.uid(); doctor := _target_user;
  elsif me_role = 'doctor' and them_role = 'patient' then
    doctor := auth.uid(); patient := _target_user;
  else
    raise exception 'conversations only exist between patients and doctors';
  end if;

  -- Require a shared appointment (existing relationship).
  select exists (
    select 1 from public.appointments
    where patient_id = patient and doctor_id = doctor
  ) into has_rel;

  if not has_rel then
    raise exception 'no doctor-patient relationship (book an appointment first)';
  end if;

  -- Upsert the conversation, then ensure both participant rows exist.
  insert into public.conversations (patient_id, doctor_id)
    values (patient, doctor)
    on conflict (patient_id, doctor_id) do update set updated_at = now()
    returning id into cid;

  insert into public.conversation_participants (conversation_id, user_id)
    values (cid, patient), (cid, doctor)
    on conflict do nothing;

  return cid;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- RLS -------------------------------------------------------------------------
alter table public.conversations              enable row level security;
alter table public.conversation_participants  enable row level security;
alter table public.messages                   enable row level security;

-- conversations: only the two participants + admin read; only the RPC creates.
drop policy if exists "participant reads conv" on public.conversations;
drop policy if exists "admin reads conv"       on public.conversations;
drop policy if exists "participant updates conv" on public.conversations;

create policy "participant reads conv" on public.conversations
  for select using (
    auth.uid() = patient_id or auth.uid() = doctor_id
  );

create policy "admin reads conv" on public.conversations
  for select using (public.is_admin());

create policy "participant updates conv" on public.conversations
  for update using (auth.uid() = patient_id or auth.uid() = doctor_id);
-- Note: no INSERT policy for conversations. Creation goes through
-- get_or_create_conversation() (SECURITY DEFINER) which enforces the
-- appointment prerequisite.

-- conversation_participants: participants read their rows.
drop policy if exists "read own participation" on public.conversation_participants;
drop policy if exists "update own participation" on public.conversation_participants;

create policy "read own participation" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or public.is_conversation_participant(conversation_id)
    or public.is_admin()
  );

create policy "update own participation" on public.conversation_participants
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages: only participants read + write.
drop policy if exists "read messages"   on public.messages;
drop policy if exists "insert messages" on public.messages;
drop policy if exists "admin reads messages" on public.messages;

create policy "read messages" on public.messages
  for select using (public.is_conversation_participant(conversation_id));

create policy "admin reads messages" on public.messages
  for select using (public.is_admin());

create policy "insert messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- Realtime --------------------------------------------------------------------
-- Enable realtime replication for messages + conversations so the client can
-- subscribe to postgres_changes.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
