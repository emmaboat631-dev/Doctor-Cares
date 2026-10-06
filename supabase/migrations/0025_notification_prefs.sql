-- ============================================================================
-- Doctor Cares — 0025 · Notification preferences
-- ============================================================================
-- Per-user toggles for each category of push notification. Defaults to all
-- on for new users; existing users keep all on until they explicitly change
-- them. send-push and send-reminders check these flags before dispatch.
-- ============================================================================

create table if not exists public.notification_prefs (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  appointments  boolean not null default true,  -- new booking, confirmed, cancelled
  reminders     boolean not null default true,  -- 24h + 1h appointment reminders
  chat          boolean not null default true,  -- new chat messages
  referrals     boolean not null default true,  -- new referral, accepted, declined
  tips          boolean not null default true,  -- health tip broadcasts
  claims        boolean not null default true,  -- NHIS claim status changes
  marketing     boolean not null default false, -- optional (default off)
  updated_at    timestamptz not null default now()
);

drop trigger if exists notif_prefs_set_updated_at on public.notification_prefs;
create trigger notif_prefs_set_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.notification_prefs enable row level security;

drop policy if exists "prefs owner reads" on public.notification_prefs;
create policy "prefs owner reads" on public.notification_prefs
  for select using (user_id = auth.uid());

drop policy if exists "prefs owner writes" on public.notification_prefs;
create policy "prefs owner writes" on public.notification_prefs
  for insert with check (user_id = auth.uid());

drop policy if exists "prefs owner updates" on public.notification_prefs;
create policy "prefs owner updates" on public.notification_prefs
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Helper: upsert prefs row for a user and return the current state.
-- Call this from the client the first time the Settings page opens.
create or replace function public.ensure_notification_prefs(_uid uuid)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.notification_prefs;
begin
  insert into public.notification_prefs (user_id) values (_uid)
    on conflict (user_id) do nothing;
  select * into row from public.notification_prefs where user_id = _uid;
  return row;
end;
$$;
grant execute on function public.ensure_notification_prefs(uuid) to authenticated;
