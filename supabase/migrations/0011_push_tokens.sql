-- ============================================================================
-- Doctor Cares — 0011 · Push notification tokens
-- ============================================================================
-- Each device that installs Doctor Cares gets a Firebase Cloud Messaging
-- (FCM) token. A single user can have multiple tokens (phone + tablet +
-- reinstalled app), so we keep them in their own table keyed by (user, token).
--
-- The client (see src/lib/native/push.ts) registers on sign-in and unregisters
-- on sign-out. An Edge Function (deploy separately) queries this table to
-- know which devices to push to when a new message or appointment status
-- change lands.
-- ============================================================================

create table if not exists public.push_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('android', 'ios', 'web')),
  device_label text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_idx on public.push_tokens(user_id);

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

-- A user can register/read/delete only their OWN tokens. The Edge Function
-- runs with service-role, so it bypasses RLS to fan out pushes.
drop policy if exists "user manages own push tokens" on public.push_tokens;
create policy "user manages own push tokens" on public.push_tokens
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.push_tokens is
  'FCM/APNs push tokens per user per device. Populated by the client after '
  'the user grants notification permission.';
