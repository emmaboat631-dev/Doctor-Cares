-- ============================================================================
-- Doctor Cares — Phase 2 · 0008 · Admin bootstrap + storage buckets
-- ============================================================================
-- This migration:
--   1. Provides a promote_to_admin RPC (callable only via SECURITY DEFINER by
--      an existing admin OR when there are no admins yet — bootstrap).
--   2. Creates the "avatars" storage bucket and its RLS policies.
-- ============================================================================

-- Admin bootstrap RPC ---------------------------------------------------------
-- Use case:
--   * First run: any signed-in user can call promote_to_admin(auth.uid())
--     ONCE — the RPC only allows it when the profiles table has ZERO admins.
--     This lets the platform team promote themselves after the first signup.
--   * Later: only an existing admin can promote someone else.
create or replace function public.promote_to_admin(_target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_admins int;
begin
  if _target_user is null then
    raise exception 'target user required';
  end if;

  select count(*) into existing_admins from public.profiles where role = 'admin';

  if existing_admins > 0 and not public.is_admin() then
    raise exception 'only admins can promote';
  end if;

  -- If there are no admins yet, allow the caller to promote themselves only.
  if existing_admins = 0 and _target_user <> auth.uid() then
    raise exception 'bootstrap can only promote yourself';
  end if;

  update public.profiles set role = 'admin' where id = _target_user;
end;
$$;

grant execute on function public.promote_to_admin(uuid) to authenticated;

comment on function public.promote_to_admin is
  'Bootstrap-safe admin promotion. When zero admins exist, a user can promote '
  'themselves (once). Afterwards, only existing admins can promote others.';

-- Storage: avatars bucket -----------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read (avatars are public).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- Only the owner can upload/update/delete their own avatar.
-- Convention: files are stored under `<user_id>/*` so the first path segment
-- must match auth.uid().
drop policy if exists "avatars owner writes" on storage.objects;
create policy "avatars owner writes" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars owner updates" on storage.objects;
create policy "avatars owner updates" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars owner deletes" on storage.objects;
create policy "avatars owner deletes" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage: chat attachments (private bucket) ---------------------------------
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- Convention: files stored under `<conversation_id>/<message_id>/<file>`.
-- Only conversation participants can read or write.
drop policy if exists "chat attachments read"  on storage.objects;
create policy "chat attachments read" on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "chat attachments write" on storage.objects;
create policy "chat attachments write" on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );
