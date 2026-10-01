-- ============================================================================
-- Doctor Cares — 0023 · NHIS claims
-- ============================================================================
-- National Health Insurance Scheme (Ghana) claims. The admin manually marks
-- a claim submitted/approved/paid for V1; a future phase can wire real NHIS
-- API submission once a partnership is in place. Patient NHIS number lives
-- on patient_profiles so a doctor can file against it from an appointment.
-- ============================================================================

alter table public.patient_profiles
  add column if not exists nhis_number    text,
  add column if not exists nhis_expires   date;

do $$ begin
  create type public.nhis_claim_status as enum
    ('draft','submitted','approved','rejected','paid');
exception when duplicate_object then null; end $$;

create table if not exists public.nhis_claims (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null unique references public.appointments(id) on delete cascade,
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id) on delete cascade,
  nhis_number     text not null,
  diagnosis       text,
  services        text,                    -- line items as free text for V1
  amount          numeric(10,2) not null check (amount >= 0),
  status          public.nhis_claim_status not null default 'draft',
  admin_notes     text,
  submitted_at    timestamptz,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists nhis_claims_patient_idx on public.nhis_claims(patient_id, created_at desc);
create index if not exists nhis_claims_doctor_idx  on public.nhis_claims(doctor_id,  created_at desc);
create index if not exists nhis_claims_status_idx  on public.nhis_claims(status,     created_at desc);

drop trigger if exists nhis_claims_set_updated_at on public.nhis_claims;
create trigger nhis_claims_set_updated_at
  before update on public.nhis_claims
  for each row execute function public.set_updated_at();

-- Auto-stamp lifecycle timestamps
create or replace function public.nhis_claim_stamp_timestamps()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at := now();
    end if;
    if new.status in ('approved','rejected','paid') and new.decided_at is null then
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists nhis_claims_stamp on public.nhis_claims;
create trigger nhis_claims_stamp
  before update on public.nhis_claims
  for each row execute function public.nhis_claim_stamp_timestamps();

-- RLS -------------------------------------------------------------------------
alter table public.nhis_claims enable row level security;

-- Patient reads their own claims
drop policy if exists "patient reads own claims" on public.nhis_claims;
create policy "patient reads own claims" on public.nhis_claims
  for select using (patient_id = auth.uid());

-- Doctor reads claims they filed
drop policy if exists "doctor reads own claims" on public.nhis_claims;
create policy "doctor reads own claims" on public.nhis_claims
  for select using (doctor_id = auth.uid());

-- Doctor creates a claim only for their own completed appointment with the patient
drop policy if exists "doctor files claim" on public.nhis_claims;
create policy "doctor files claim" on public.nhis_claims
  for insert
  with check (
    doctor_id = auth.uid()
    and exists (
      select 1 from public.appointments a
      where a.id = nhis_claims.appointment_id
        and a.doctor_id  = auth.uid()
        and a.patient_id = nhis_claims.patient_id
        and a.status in ('completed','confirmed')
    )
  );

-- Doctor edits their own draft/submitted claim
drop policy if exists "doctor updates own claim" on public.nhis_claims;
create policy "doctor updates own claim" on public.nhis_claims
  for update using (doctor_id = auth.uid() and status in ('draft','submitted'))
  with check (doctor_id = auth.uid());

-- Doctor deletes their own draft claim
drop policy if exists "doctor deletes own draft" on public.nhis_claims;
create policy "doctor deletes own draft" on public.nhis_claims
  for delete using (doctor_id = auth.uid() and status = 'draft');

-- Admin can do everything
drop policy if exists "admin reads all claims" on public.nhis_claims;
create policy "admin reads all claims" on public.nhis_claims
  for select using (public.is_admin());

drop policy if exists "admin updates claims" on public.nhis_claims;
create policy "admin updates claims" on public.nhis_claims
  for update using (public.is_admin()) with check (public.is_admin());
