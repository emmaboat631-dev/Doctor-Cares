-- ============================================================================
-- Doctor Cares — 0012 · Presence (last-seen timestamps)
-- ============================================================================
-- Adds public.profiles.last_seen_at + a SECURITY DEFINER RPC the client
-- calls on a heartbeat to update its own row. Renderers compare against
-- now() — under 2 min → "Online"; older → "Last seen X ago".
--
-- Why an RPC and not a direct UPDATE: keeps the WITH CHECK on the
-- "update own profile" policy from firing (that policy re-reads the row's
-- role, which recursion-safety-wise is best kept off the heartbeat path).
-- ============================================================================

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_idx on public.profiles(last_seen_at desc);

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_seen_at = now()
   where id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;

comment on function public.touch_last_seen is
  'Heartbeat setter — the client calls this every ~60s while foregrounded '
  'so the other party in a chat can render an accurate online/last-seen badge.';
