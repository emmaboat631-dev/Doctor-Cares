-- ============================================================================
-- Doctor Cares — 0015 · Health metrics (vitals log)
-- ============================================================================
-- A simple time-series store of patient vital readings. Each row is one
-- measurement at a point in time. Blood pressure uses `value` for systolic
-- and `value2` for diastolic; other types leave `value2` null.
-- ============================================================================

create table if not exists public.health_metrics (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in (
                'heart_rate', 'bp', 'temperature', 'weight', 'glucose', 'spo2'
              )),
  value       numeric(8,2) not null,
  value2      numeric(8,2),      -- diastolic for bp; null otherwise
  unit        text not null,     -- bpm, mmHg, degC, kg, mg/dL, %
  taken_at    timestamptz not null default now(),
  notes       text check (char_length(notes) <= 500),
  created_at  timestamptz not null default now()
);

create index if not exists health_metrics_user_time_idx
  on public.health_metrics(user_id, type, taken_at desc);

-- RLS -------------------------------------------------------------------------
alter table public.health_metrics enable row level security;

-- Patient reads own
drop policy if exists "metrics owner reads" on public.health_metrics;
create policy "metrics owner reads" on public.health_metrics
  for select using (user_id = auth.uid());

-- Patient writes/edits/deletes own
drop policy if exists "metrics owner writes" on public.health_metrics;
create policy "metrics owner writes" on public.health_metrics
  for insert with check (user_id = auth.uid());

drop policy if exists "metrics owner updates" on public.health_metrics;
create policy "metrics owner updates" on public.health_metrics
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "metrics owner deletes" on public.health_metrics;
create policy "metrics owner deletes" on public.health_metrics
  for delete using (user_id = auth.uid());

-- Doctor reads metrics for patients they share an appointment with.
drop policy if exists "doctor reads patient metrics" on public.health_metrics;
create policy "doctor reads patient metrics" on public.health_metrics
  for select using (
    exists (
      select 1 from public.appointments a
      where a.patient_id = health_metrics.user_id
        and a.doctor_id  = auth.uid()
    )
  );

-- Admin reads all
drop policy if exists "admin reads metrics" on public.health_metrics;
create policy "admin reads metrics" on public.health_metrics
  for select using (public.is_admin());
