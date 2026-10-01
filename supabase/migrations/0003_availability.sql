-- ============================================================================
-- Doctor Cares — Phase 2 · 0003 · Doctor availability
-- ============================================================================
-- Two tables:
--   doctor_availability   — recurring weekly windows (per doctor per weekday)
--   doctor_blocked_dates  — one-off blackouts (holidays, leave)
-- Slot generation happens client-side; the DB enforces raw windows only.
-- ============================================================================

create table if not exists public.doctor_availability (
  id            uuid primary key default gen_random_uuid(),
  doctor_id     uuid not null references public.doctor_profiles(id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),  -- 0=Sunday .. 6=Saturday
  start_time    time not null,
  end_time      time not null check (end_time > start_time),
  slot_minutes  smallint not null default 30 check (slot_minutes in (15,20,30,45,60)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- A doctor may have multiple windows per day (e.g. morning + afternoon),
  -- but no two windows may share the exact same start on the same weekday.
  unique (doctor_id, weekday, start_time)
);

create index if not exists doctor_avail_doctor_idx on public.doctor_availability(doctor_id);

drop trigger if exists doctor_avail_set_updated_at on public.doctor_availability;
create trigger doctor_avail_set_updated_at
  before update on public.doctor_availability
  for each row execute function public.set_updated_at();

create table if not exists public.doctor_blocked_dates (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references public.doctor_profiles(id) on delete cascade,
  start_date   date not null,
  end_date     date not null check (end_date >= start_date),
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists doctor_blocked_doctor_idx on public.doctor_blocked_dates(doctor_id);
create index if not exists doctor_blocked_range_idx  on public.doctor_blocked_dates(start_date, end_date);

-- RLS -------------------------------------------------------------------------
alter table public.doctor_availability   enable row level security;
alter table public.doctor_blocked_dates  enable row level security;

-- Availability is public info: anyone browsing a doctor needs to see it.
drop policy if exists "read availability"     on public.doctor_availability;
drop policy if exists "doctor writes own avail" on public.doctor_availability;
drop policy if exists "admin writes avail"    on public.doctor_availability;

create policy "read availability" on public.doctor_availability
  for select using (true);

create policy "doctor writes own avail" on public.doctor_availability
  for all using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id and public.is_doctor());

create policy "admin writes avail" on public.doctor_availability
  for all using (public.is_admin())
  with check (public.is_admin());

-- Blocked dates: same access rules.
drop policy if exists "read blocked"         on public.doctor_blocked_dates;
drop policy if exists "doctor writes blocked" on public.doctor_blocked_dates;
drop policy if exists "admin writes blocked"  on public.doctor_blocked_dates;

create policy "read blocked" on public.doctor_blocked_dates
  for select using (true);

create policy "doctor writes blocked" on public.doctor_blocked_dates
  for all using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id and public.is_doctor());

create policy "admin writes blocked" on public.doctor_blocked_dates
  for all using (public.is_admin())
  with check (public.is_admin());
