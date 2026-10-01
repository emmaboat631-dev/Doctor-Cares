-- ============================================================================
-- Doctor Cares — Phase 2 · 0002 · Profiles (base + patient + doctor)
-- ============================================================================
-- One row per auth.users record. Role decides which side-table applies.
-- Patient/doctor tables are 1:1 with profiles, keyed by profiles.id.
-- ============================================================================

-- Base profile ----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         public.user_role      not null default 'patient',
  full_name    text,
  avatar_url   text,
  phone        text,
  status       public.account_status not null default 'active',
  created_at   timestamptz           not null default now(),
  updated_at   timestamptz           not null default now()
);

create index if not exists profiles_role_idx   on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role-check helpers ---------------------------------------------------------
-- Defined here (not in 0001) because they reference public.profiles which
-- Postgres validates at function-creation time.
-- SECURITY DEFINER so RLS on profiles doesn't create a recursion loop.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;
grant execute on function public.current_role() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'doctor', false);
$$;
grant execute on function public.is_doctor() to authenticated;

create or replace function public.is_patient()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'patient', false);
$$;
grant execute on function public.is_patient() to authenticated;

comment on function public.current_role is
  'Returns the role of the currently authenticated user (from profiles.role). '
  'SECURITY DEFINER so it can be called safely from RLS policies without recursion.';

-- Patient profile -------------------------------------------------------------
create table if not exists public.patient_profiles (
  id            uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth date,
  gender        text,
  blood_group   text,
  allergies     text,
  updated_at    timestamptz not null default now()
);

drop trigger if exists patient_profiles_set_updated_at on public.patient_profiles;
create trigger patient_profiles_set_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

-- Doctor profile --------------------------------------------------------------
create table if not exists public.doctor_profiles (
  id                uuid primary key references public.profiles(id) on delete cascade,
  specialty         text,
  qualifications    text,
  bio               text,
  years_experience  int check (years_experience >= 0),
  consultation_fee  numeric(10,2) check (consultation_fee >= 0),
  modes             public.appointment_mode[] not null default '{video}',
  is_verified       boolean       not null default false,
  rating            numeric(3,2)  check (rating between 0 and 5),
  rating_count      int           not null default 0,
  clinic_address    text,
  languages         text[]        not null default '{English}',
  updated_at        timestamptz   not null default now()
);

create index if not exists doctor_specialty_idx  on public.doctor_profiles(specialty);
create index if not exists doctor_verified_idx   on public.doctor_profiles(is_verified);
create index if not exists doctor_rating_idx     on public.doctor_profiles(rating desc);

drop trigger if exists doctor_profiles_set_updated_at on public.doctor_profiles;
create trigger doctor_profiles_set_updated_at
  before update on public.doctor_profiles
  for each row execute function public.set_updated_at();

-- Auth trigger: create a profile row on signup --------------------------------
-- Signup metadata is passed in options.data during supabase.auth.signUp().
-- We accept { role, full_name } and default role to 'patient'.
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
  -- Role: patient/doctor only from signup — admin must be provisioned manually.
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

  -- Create the side table so we always have a 1:1 row to update.
  if desired_role = 'patient' then
    insert into public.patient_profiles (id) values (new.id);
  elsif desired_role = 'doctor' then
    insert into public.doctor_profiles (id, is_verified) values (new.id, false);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS -------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.patient_profiles  enable row level security;
alter table public.doctor_profiles   enable row level security;

-- profiles: users can read + update their own row; doctor names are readable
-- by any authenticated user (so patients can browse doctors); admins see all.
drop policy if exists "read own profile"        on public.profiles;
drop policy if exists "read doctor names"       on public.profiles;
drop policy if exists "admin reads all profiles" on public.profiles;
drop policy if exists "update own profile"      on public.profiles;
drop policy if exists "admin updates profiles"  on public.profiles;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "read doctor names" on public.profiles
  for select using (role = 'doctor' and status = 'active');

create policy "admin reads all profiles" on public.profiles
  for select using (public.is_admin());

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
  -- Users cannot change their own role — RLS blocks the update. Role changes
  -- must go through an admin-only path.

create policy "admin updates profiles" on public.profiles
  for update using (public.is_admin());

-- patient_profiles: only the patient themselves + admin can read/update.
-- Doctors get patient info via appointments (see later migrations).
drop policy if exists "patient reads own"    on public.patient_profiles;
drop policy if exists "patient updates own"  on public.patient_profiles;
drop policy if exists "admin reads patient"  on public.patient_profiles;

create policy "patient reads own" on public.patient_profiles
  for select using (auth.uid() = id);

create policy "patient updates own" on public.patient_profiles
  for update using (auth.uid() = id);

create policy "admin reads patient" on public.patient_profiles
  for select using (public.is_admin());

-- doctor_profiles: the doctor themselves updates their profile.
-- Any authenticated user can READ verified doctor profiles (marketplace).
drop policy if exists "read verified doctors" on public.doctor_profiles;
drop policy if exists "doctor reads own"      on public.doctor_profiles;
drop policy if exists "doctor updates own"    on public.doctor_profiles;
drop policy if exists "admin reads doctors"   on public.doctor_profiles;
drop policy if exists "admin updates doctors" on public.doctor_profiles;

create policy "read verified doctors" on public.doctor_profiles
  for select using (is_verified = true);

create policy "doctor reads own" on public.doctor_profiles
  for select using (auth.uid() = id);

create policy "doctor updates own" on public.doctor_profiles
  for update using (auth.uid() = id);

create policy "admin reads doctors" on public.doctor_profiles
  for select using (public.is_admin());

create policy "admin updates doctors" on public.doctor_profiles
  for update using (public.is_admin());
