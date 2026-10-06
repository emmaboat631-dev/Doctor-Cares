-- ============================================================================
-- Doctor Cares — 0024 · E-prescriptions
-- ============================================================================
-- A prescription is written by a doctor/nurse for a patient, optionally
-- tied to the appointment it was issued at. medications is a jsonb array
-- of structured line items {name, dosage, frequency, duration, instructions}
-- so the PDF renderer, pharmacy export, and future prescription-refill flows
-- can all read the same shape.
-- ============================================================================

create table if not exists public.prescriptions (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  appointment_id  uuid references public.appointments(id) on delete set null,
  medications     jsonb not null default '[]'::jsonb,
  diagnosis       text,
  notes           text,
  issued_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists rx_patient_idx    on public.prescriptions(patient_id, issued_at desc);
create index if not exists rx_doctor_idx     on public.prescriptions(doctor_id,  issued_at desc);
create index if not exists rx_appointment_idx on public.prescriptions(appointment_id);

drop trigger if exists prescriptions_set_updated_at on public.prescriptions;
create trigger prescriptions_set_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.prescriptions enable row level security;

-- Patient reads their own
drop policy if exists "patient reads own rx" on public.prescriptions;
create policy "patient reads own rx" on public.prescriptions
  for select using (patient_id = auth.uid());

-- Doctor reads what they wrote
drop policy if exists "doctor reads own rx" on public.prescriptions;
create policy "doctor reads own rx" on public.prescriptions
  for select using (doctor_id = auth.uid());

-- Doctor writes a prescription for a patient they've shared an appointment with
drop policy if exists "doctor writes rx" on public.prescriptions;
create policy "doctor writes rx" on public.prescriptions
  for insert with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.doctor_id  = auth.uid()
        and a.patient_id = prescriptions.patient_id
    )
  );

-- Doctor edits their own
drop policy if exists "doctor updates own rx" on public.prescriptions;
create policy "doctor updates own rx" on public.prescriptions
  for update using (doctor_id = auth.uid()) with check (doctor_id = auth.uid());

-- Doctor deletes their own
drop policy if exists "doctor deletes own rx" on public.prescriptions;
create policy "doctor deletes own rx" on public.prescriptions
  for delete using (doctor_id = auth.uid());

-- Admin reads all
drop policy if exists "admin reads rx" on public.prescriptions;
create policy "admin reads rx" on public.prescriptions
  for select using (public.is_admin());
