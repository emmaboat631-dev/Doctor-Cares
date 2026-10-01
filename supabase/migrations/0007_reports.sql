-- ============================================================================
-- Doctor Cares — Phase 2 · 0007 · Reports (moderation queue)
-- ============================================================================
-- Any authenticated user can file a report against a user, appointment,
-- message or conversation. Only admins can read + act on reports.
-- ============================================================================

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete set null,
  target_type   public.report_target_type not null,
  target_id     uuid not null,
  reason        text not null check (char_length(reason) between 5 and 2000),
  priority      public.report_priority not null default 'medium',
  status        public.report_status   not null default 'open',
  resolved_by   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz,
  resolution_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists reports_status_idx  on public.reports(status);
create index if not exists reports_target_idx  on public.reports(target_type, target_id);
create index if not exists reports_created_idx on public.reports(created_at desc);

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- Optional: drug search history (audit trail for OpenFDA lookups). ----------
-- Stored per-user, useful for a "Recent searches" quick access panel in the
-- Drugs section.
create table if not exists public.drug_search_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  query        text not null,
  drug_name    text,
  created_at   timestamptz not null default now()
);

create index if not exists drug_hist_user_idx on public.drug_search_history(user_id, created_at desc);

-- RLS -------------------------------------------------------------------------
alter table public.reports enable row level security;

drop policy if exists "user files report"    on public.reports;
drop policy if exists "user reads own reports" on public.reports;
drop policy if exists "admin reads reports"  on public.reports;
drop policy if exists "admin manages reports" on public.reports;

-- Anyone signed in can file a report on their own behalf.
create policy "user files report" on public.reports
  for insert with check (reporter_id = auth.uid() and status = 'open');

-- Users can see the reports THEY filed (transparency).
create policy "user reads own reports" on public.reports
  for select using (reporter_id = auth.uid());

-- Admins see everything and can update / resolve.
create policy "admin reads reports" on public.reports
  for select using (public.is_admin());

create policy "admin manages reports" on public.reports
  for update using (public.is_admin())
  with check (public.is_admin());

-- drug_search_history: only self read/write; admins have no reason to see it.
alter table public.drug_search_history enable row level security;

drop policy if exists "self reads drug history"   on public.drug_search_history;
drop policy if exists "self writes drug history"  on public.drug_search_history;
drop policy if exists "self deletes drug history" on public.drug_search_history;

create policy "self reads drug history" on public.drug_search_history
  for select using (user_id = auth.uid());

create policy "self writes drug history" on public.drug_search_history
  for insert with check (user_id = auth.uid());

create policy "self deletes drug history" on public.drug_search_history
  for delete using (user_id = auth.uid());
