-- ============================================================================
-- Doctor Cares — 0022 · Nurse sub-role (Independent clinician model)
-- ============================================================================
-- Adds `nurse` to user_role, a nurse_profiles table mirroring doctor_profiles,
-- a signup-trigger extension so new nurses get a 1:1 row, RLS mirroring
-- doctor_profiles, and a public.providers view that unions doctors + nurses
-- for patient-facing search.
-- ============================================================================

do $$ begin
  alter type public.user_role add value if not exists 'nurse';
exception when duplicate_object then null; end $$;

create table if not exists public.nurse_profiles (
  id                uuid primary key references public.profiles(id) on delete cascade,
  specialization    text,              -- "midwifery", "general care", "pediatric nursing"
  licence_number    text,
  qualifications    text,
  bio               text,
  years_experience  int check (years_experience >= 0),
  consultation_fee  numeric(10,2) check (consultation_fee >= 0),
  modes             public.appointment_mode[] not null default '{clinic}',
  is_verified       boolean       not null default false,
  rating            numeric(3,2)  check (rating between 0 and 5),
  rating_count      int           not null default 0,
  clinic_address    text,
  languages         text[]        not null default '{English}',
  updated_at        timestamptz   not null default now()
);

create index if not exists nurse_verified_idx on public.nurse_profiles(is_verified);
create index if not exists nurse_rating_idx   on public.nurse_profiles(rating desc);

drop trigger if exists nurse_profiles_set_updated_at on public.nurse_profiles;
create trigger nurse_profiles_set_updated_at
  before update on public.nurse_profiles
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.nurse_profiles enable row level security;

drop policy if exists "read verified nurses" on public.nurse_profiles;
create policy "read verified nurses" on public.nurse_profiles
  for select using (is_verified = true);

drop policy if exists "nurse reads own" on public.nurse_profiles;
create policy "nurse reads own" on public.nurse_profiles
  for select using (auth.uid() = id);

drop policy if exists "nurse updates own" on public.nurse_profiles;
create policy "nurse updates own" on public.nurse_profiles
  for update using (auth.uid() = id);

drop policy if exists "admin reads nurses" on public.nurse_profiles;
create policy "admin reads nurses" on public.nurse_profiles
  for select using (public.is_admin());

drop policy if exists "admin updates nurses" on public.nurse_profiles;
create policy "admin updates nurses" on public.nurse_profiles
  for update using (public.is_admin());

-- Allow doctor-name read policy to see nurse full_names too.
drop policy if exists "read nurse names" on public.profiles;
create policy "read nurse names" on public.profiles
  for select using (role = 'nurse' and status = 'active');

-- Signup trigger: create a nurse_profiles row for new nurses.
-- Re-create handle_new_user to add the 'nurse' branch; existing patient
-- and doctor branches are preserved.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_role public.user_role;
  meta_full_name text;
begin
  begin
    desired_role := coalesce(
      (new.raw_user_meta_data ->> 'role')::public.user_role,
      'patient'
    );
    if desired_role = 'admin' then
      desired_role := 'patient';
    end if;
  exception when others then
    desired_role := 'patient';
  end;

  meta_full_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, role, full_name)
    values (new.id, desired_role, meta_full_name);

  if desired_role = 'patient' then
    insert into public.patient_profiles (id) values (new.id);
  elsif desired_role = 'doctor' then
    insert into public.doctor_profiles (id, is_verified) values (new.id, false);
  elsif desired_role = 'nurse' then
    insert into public.nurse_profiles (id, is_verified) values (new.id, false);
  end if;

  return new;
end;
$$;

-- A `providers` view unifies doctors and nurses for patient-facing search.
-- The patient directory + booking flow query this view and get a `role`
-- column so the UI can render a doctor/nurse badge.
create or replace view public.providers
with (security_invoker = true) as
  select
    p.id, p.full_name, p.avatar_url,
    'doctor'::text          as role,
    d.specialty             as specialization,
    d.qualifications,
    d.bio,
    d.years_experience,
    d.consultation_fee,
    d.modes,
    d.is_verified,
    d.rating,
    d.rating_count,
    d.clinic_address,
    d.languages
  from public.doctor_profiles d
  join public.profiles p on p.id = d.id
  union all
  select
    p.id, p.full_name, p.avatar_url,
    'nurse'::text           as role,
    n.specialization,
    n.qualifications,
    n.bio,
    n.years_experience,
    n.consultation_fee,
    n.modes,
    n.is_verified,
    n.rating,
    n.rating_count,
    n.clinic_address,
    n.languages
  from public.nurse_profiles n
  join public.profiles p on p.id = n.id;

grant select on public.providers to authenticated;
