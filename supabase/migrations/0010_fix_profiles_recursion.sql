-- ============================================================================
-- Doctor Cares — 0010 · Fix infinite recursion in profiles policy (0009)
-- ============================================================================
-- Migration 0009 added a SELECT policy on `profiles` that ran a subquery on
-- `appointments`. When Postgres evaluated it (e.g. during an UPDATE on a
-- profile whose WITH CHECK reads back from profiles), the join back to
-- profiles inside the subquery re-triggered profiles RLS → infinite recursion.
--
-- The safe pattern is a SECURITY DEFINER helper function: it queries
-- appointments as the function owner (bypassing RLS entirely), so the outer
-- policy never re-enters profiles/appointments RLS. Same semantics, no loop.
-- ============================================================================

-- 1. Remove the recursive policy from 0009.
drop policy if exists "read profiles of shared appointments" on public.profiles;

-- 2. Helper: "does the current user share at least one appointment with
--    `other_user`?" Runs under the function owner so nothing recurses back
--    into RLS. Marked STABLE because it depends on auth.uid() + data reads
--    but does not modify anything.
create or replace function public.shares_appointment_with(other_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.appointments a
    where (a.doctor_id  = auth.uid() and a.patient_id = other_user)
       or (a.patient_id = auth.uid() and a.doctor_id  = other_user)
  );
$$;

grant execute on function public.shares_appointment_with(uuid) to authenticated;

comment on function public.shares_appointment_with is
  'True when the caller shares at least one appointment with the given user. '
  'SECURITY DEFINER so it can be called from RLS on profiles without recursing '
  'back into appointment RLS.';

-- 3. Re-create the SELECT policy using the helper.
create policy "read profiles of shared appointments" on public.profiles
  for select using (public.shares_appointment_with(id));

comment on policy "read profiles of shared appointments" on public.profiles is
  'A user can see the profile of anyone they share at least one appointment '
  'with — powers the doctor "My patients" list, chat headers and appointment '
  'cards without weakening default self-only privacy. Recursion-safe via '
  'shares_appointment_with().';
