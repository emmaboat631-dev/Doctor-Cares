-- ============================================================================
-- Doctor Cares — Phase 2 · 0004 · Appointments
-- ============================================================================
-- One appointment per (doctor, scheduled_at). Uses an EXCLUSION constraint on
-- the [scheduled_at, scheduled_at + duration) range so overlapping bookings
-- for the same doctor are rejected atomically at INSERT/UPDATE time.
-- ============================================================================

create extension if not exists btree_gist;

create table if not exists public.appointments (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.profiles(id) on delete restrict,
  doctor_id         uuid not null references public.profiles(id) on delete restrict,
  scheduled_at      timestamptz not null,
  duration_minutes  smallint    not null default 30 check (duration_minutes between 5 and 240),
  mode              public.appointment_mode   not null default 'video',
  status            public.appointment_status not null default 'pending',
  reason            text,
  doctor_notes      text,
  fee               numeric(10,2) check (fee >= 0),
  cancelled_at      timestamptz,
  cancelled_by      uuid references public.profiles(id) on delete set null,
  cancel_reason     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Sanity: doctor and patient must be distinct
  constraint appointments_distinct_parties check (patient_id <> doctor_id),
  -- Overlap guard: for a given doctor, no two non-cancelled appointments may
  -- occupy overlapping time ranges.
  --
  -- Why the timezone('UTC', …) dance: Postgres index expressions must be
  -- IMMUTABLE, but `timestamptz + interval` is STABLE (depends on session TZ)
  -- and `tstzrange` therefore inherits that. Converting to plain `timestamp`
  -- with `timezone('UTC', ts)` produces an IMMUTABLE expression, and range
  -- overlap logic is TZ-agnostic — normalizing everything to UTC first gives
  -- the same overlap semantics.
  constraint appointments_no_overlap exclude using gist (
    doctor_id with =,
    tsrange(
      timezone('UTC', scheduled_at),
      timezone('UTC', scheduled_at) + make_interval(mins => duration_minutes::int),
      '[)'
    ) with &&
  ) where (status in ('pending', 'confirmed'))
);

create index if not exists appt_patient_idx        on public.appointments(patient_id);
create index if not exists appt_doctor_idx         on public.appointments(doctor_id);
create index if not exists appt_scheduled_idx      on public.appointments(scheduled_at);
create index if not exists appt_status_idx         on public.appointments(status);
create index if not exists appt_doctor_time_idx    on public.appointments(doctor_id, scheduled_at);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- Helper: does the CURRENT patient have any appointment with the given doctor?
-- Used by RLS on doctor_profiles to allow patients who booked to see private
-- fields, and vice-versa via has_appointment_with_patient().
create or replace function public.has_appointment_with_doctor(_doctor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.appointments
    where patient_id = auth.uid() and doctor_id = _doctor_id
  );
$$;

grant execute on function public.has_appointment_with_doctor(uuid) to authenticated;

-- Helper: does the CURRENT doctor have any appointment with the given patient?
create or replace function public.has_appointment_with_patient(_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.appointments
    where doctor_id = auth.uid() and patient_id = _patient_id
  );
$$;

grant execute on function public.has_appointment_with_patient(uuid) to authenticated;

-- Extend patient_profiles RLS: doctors who have an appointment with the
-- patient may read the patient's medical profile.
drop policy if exists "doctor reads patient via appointment" on public.patient_profiles;
create policy "doctor reads patient via appointment" on public.patient_profiles
  for select using (public.is_doctor() and public.has_appointment_with_patient(id));

-- RLS on appointments ---------------------------------------------------------
alter table public.appointments enable row level security;

drop policy if exists "patient reads own appts"    on public.appointments;
drop policy if exists "doctor reads own appts"     on public.appointments;
drop policy if exists "admin reads all appts"      on public.appointments;
drop policy if exists "patient creates own"        on public.appointments;
drop policy if exists "patient updates own"        on public.appointments;
drop policy if exists "doctor updates own appts"   on public.appointments;
drop policy if exists "admin writes appts"         on public.appointments;

-- SELECT
create policy "patient reads own appts" on public.appointments
  for select using (auth.uid() = patient_id);

create policy "doctor reads own appts" on public.appointments
  for select using (auth.uid() = doctor_id);

create policy "admin reads all appts" on public.appointments
  for select using (public.is_admin());

-- INSERT — only patients can create their own bookings.
create policy "patient creates own" on public.appointments
  for insert with check (
    auth.uid() = patient_id
    and public.is_patient()
    and status = 'pending'
    and cancelled_at is null
  );

-- UPDATE — patients may only change their own bookings, and only to cancel or
-- adjust reason before it's confirmed. Column-level restrictions are enforced
-- by application logic; RLS ensures the row belongs to them.
create policy "patient updates own" on public.appointments
  for update using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- Doctors update status (confirm/reject/complete) + add notes.
create policy "doctor updates own appts" on public.appointments
  for update using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

create policy "admin writes appts" on public.appointments
  for all using (public.is_admin())
  with check (public.is_admin());
