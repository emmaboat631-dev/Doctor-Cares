-- ============================================================================
-- Doctor Cares — 0009 · Let doctors read profiles of their patients
-- ============================================================================
-- Bug fix: doctor's "My patients" tab was empty because the FK join on
-- profiles returned NULL. Root cause: RLS on public.profiles limited SELECT
-- to self + verified doctors + admins. Doctors could see appointments with
-- patient_id set, but not the patient's name/avatar.
--
-- Fix: add a SELECT policy allowing a doctor to read a profile row when they
-- share at least one appointment with that user. Same policy is symmetric —
-- a patient can also read the profile of any doctor they've booked (useful
-- for chat headers / appointment cards).
-- ============================================================================

drop policy if exists "read profiles of shared appointments" on public.profiles;

create policy "read profiles of shared appointments" on public.profiles
  for select using (
    exists (
      select 1
      from public.appointments a
      where (a.doctor_id  = auth.uid() and a.patient_id = public.profiles.id)
         or (a.patient_id = auth.uid() and a.doctor_id  = public.profiles.id)
    )
  );

comment on policy "read profiles of shared appointments" on public.profiles is
  'A user can see the profile of anyone they share at least one appointment '
  'with — powers the doctor "My patients" list, chat headers, and appointment '
  'cards without weakening default self-only privacy.';
