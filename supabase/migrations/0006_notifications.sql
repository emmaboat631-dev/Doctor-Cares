-- ============================================================================
-- Doctor Cares — Phase 2 · 0006 · Notifications
-- ============================================================================
-- One row per notification, addressed to a single recipient. Triggers off
-- appointment and message events keep them in sync automatically.
-- ============================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text,
  href         text,                 -- deep link (client-side route)
  metadata     jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists notif_user_idx    on public.notifications(user_id, created_at desc);
create index if not exists notif_unread_idx  on public.notifications(user_id) where read_at is null;

-- Trigger: on appointment status changes, notify the counterparty. -----------
create or replace function public.notify_on_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor  uuid;
  target uuid;
  title  text;
  href   text;
begin
  href := '/appointments/' || new.id;

  -- INSERT: new booking -> notify the doctor
  if (tg_op = 'INSERT') then
    insert into public.notifications (user_id, type, title, body, href, metadata)
    values (
      new.doctor_id,
      'appointment',
      'New appointment request',
      to_char(new.scheduled_at at time zone 'UTC', 'FMDay, Mon FMDD · HH24:MI'),
      href,
      jsonb_build_object('appointment_id', new.id, 'status', new.status)
    );
    return new;
  end if;

  -- UPDATE: only when status actually changed
  if (tg_op = 'UPDATE' and new.status <> old.status) then
    actor  := auth.uid();
    -- The status-changer is one side; notify the other side.
    if actor = new.doctor_id then
      target := new.patient_id;
    else
      target := new.doctor_id;
    end if;

    title := case new.status
      when 'confirmed' then 'Appointment confirmed'
      when 'rejected'  then 'Appointment declined'
      when 'cancelled' then 'Appointment cancelled'
      when 'completed' then 'Appointment marked complete'
      else 'Appointment updated'
    end;

    insert into public.notifications (user_id, type, title, body, href, metadata)
    values (
      target,
      'appointment',
      title,
      to_char(new.scheduled_at at time zone 'UTC', 'FMDay, Mon FMDD · HH24:MI'),
      href,
      jsonb_build_object('appointment_id', new.id, 'status', new.status, 'previous', old.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_notify on public.appointments;
create trigger appointments_notify
  after insert or update on public.appointments
  for each row execute function public.notify_on_appointment_change();

-- Trigger: on new message -> notify the other participant. ------------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  patient uuid;
  doctor  uuid;
  target  uuid;
  sender_name text;
begin
  select c.patient_id, c.doctor_id into patient, doctor
    from public.conversations c where c.id = new.conversation_id;

  target := case when new.sender_id = patient then doctor else patient end;

  select full_name into sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, href, metadata)
  values (
    target,
    'message',
    coalesce(sender_name, 'New message'),
    left(new.body, 140),
    '/chat/' || new.conversation_id,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- RLS -------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "user reads own notifs"    on public.notifications;
drop policy if exists "user updates own notifs"  on public.notifications;
drop policy if exists "user deletes own notifs"  on public.notifications;
drop policy if exists "admin reads all notifs"   on public.notifications;

create policy "user reads own notifs" on public.notifications
  for select using (user_id = auth.uid());

create policy "user updates own notifs" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user deletes own notifs" on public.notifications
  for delete using (user_id = auth.uid());

create policy "admin reads all notifs" on public.notifications
  for select using (public.is_admin());

-- No INSERT policy — notifications are created only by SECURITY DEFINER
-- triggers above, not by client code.

alter publication supabase_realtime add table public.notifications;
