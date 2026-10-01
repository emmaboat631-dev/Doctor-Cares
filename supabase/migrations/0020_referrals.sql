-- ============================================================================
-- Doctor Cares — 0020 · Referrals
-- ============================================================================
-- A doctor refers a patient to another specialist. Lifecycle:
--   pending   — target doctor hasn't acted yet
--   accepted  — target doctor took the referral; patient can now book
--   declined  — target doctor refused
--   completed — the follow-up appointment happened
-- ============================================================================

create table if not exists public.referrals (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  from_doctor_id  uuid not null references public.profiles(id) on delete cascade,
  to_doctor_id    uuid not null references public.profiles(id) on delete cascade,
  reason          text not null check (char_length(reason) between 2 and 500),
  notes           text check (char_length(notes) <= 2000),
  status          text not null default 'pending'
                    check (status in ('pending','accepted','declined','completed')),
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (from_doctor_id <> to_doctor_id)
);

create index if not exists referrals_patient_idx     on public.referrals(patient_id,     created_at desc);
create index if not exists referrals_from_idx        on public.referrals(from_doctor_id, created_at desc);
create index if not exists referrals_to_idx          on public.referrals(to_doctor_id,   created_at desc);
create index if not exists referrals_to_status_idx   on public.referrals(to_doctor_id, status);

drop trigger if exists referrals_set_updated_at on public.referrals;
create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- Stamp responded_at automatically when status leaves pending
create or replace function public.referral_stamp_responded_at()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending' and new.responded_at is null then
    new.responded_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists referrals_stamp_responded on public.referrals;
create trigger referrals_stamp_responded
  before update on public.referrals
  for each row execute function public.referral_stamp_responded_at();

-- RLS -------------------------------------------------------------------------
alter table public.referrals enable row level security;

-- Everyone involved reads: patient, from-doctor, to-doctor
drop policy if exists "referral participants read" on public.referrals;
create policy "referral participants read" on public.referrals
  for select using (
    auth.uid() in (patient_id, from_doctor_id, to_doctor_id)
  );

-- Only the from-doctor creates a referral, and only if they share an
-- appointment with the patient (so you can't refer strangers).
drop policy if exists "doctor creates referral" on public.referrals;
create policy "doctor creates referral" on public.referrals
  for insert
  with check (
    from_doctor_id = auth.uid()
    and public.is_doctor()
    and exists (
      select 1 from public.appointments a
      where a.doctor_id  = auth.uid()
        and a.patient_id = referrals.patient_id
    )
  );

-- The target doctor updates status (accept / decline / complete).
drop policy if exists "to-doctor updates status" on public.referrals;
create policy "to-doctor updates status" on public.referrals
  for update using (to_doctor_id = auth.uid())
  with check (to_doctor_id = auth.uid());

-- The sending doctor may cancel their own pending referral by deleting it.
drop policy if exists "from-doctor deletes own" on public.referrals;
create policy "from-doctor deletes own" on public.referrals
  for delete using (from_doctor_id = auth.uid() and status = 'pending');

-- Admin reads all
drop policy if exists "admin reads referrals" on public.referrals;
create policy "admin reads referrals" on public.referrals
  for select using (public.is_admin());

-- Push notification trigger: POST to send-push via pg_net on INSERT and on
-- status transitions. send-push decides who to notify.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_referral_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_url text;
  push_url text;
begin
  base_url := current_setting('app.settings.function_url', true);
  if base_url is null then return new; end if;
  push_url := regexp_replace(base_url, '/[^/]+$', '/send-push');

  perform net.http_post(
    url     := push_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := jsonb_build_object(
      'type',   tg_op,
      'table',  'referrals',
      'record', row_to_json(new),
      'old_record', case when tg_op = 'UPDATE' then row_to_json(old) else null end
    ),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

drop trigger if exists referrals_notify on public.referrals;
create trigger referrals_notify
  after insert or update on public.referrals
  for each row execute function public.notify_referral_change();
