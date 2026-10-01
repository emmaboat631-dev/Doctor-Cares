-- ============================================================================
-- Doctor Cares — 0016 · Emergency SOS (patient next-of-kin)
-- ============================================================================
-- Adds optional emergency-contact fields to patient_profiles so the SOS
-- sheet on the patient dashboard can offer a one-tap tel: dial to the
-- person the patient listed as their next-of-kin.
-- ============================================================================

alter table public.patient_profiles
  add column if not exists emergency_contact_name  text,
  add column if not exists emergency_contact_phone text,
  add column if not exists emergency_contact_relation text;
