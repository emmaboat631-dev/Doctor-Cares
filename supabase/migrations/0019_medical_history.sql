-- ============================================================================
-- Doctor Cares — 0019 · Medical history
-- ============================================================================
-- Expands patient_profiles with the clinically relevant history a doctor
-- needs on first encounter. Kept as flat columns + text[] arrays so there
-- are no new join tables to maintain, and arrays render naturally as chips
-- in the UI. Height/weight live on patient_profiles too (vitals history
-- stays in health_metrics; height rarely changes so it's a profile value).
-- ============================================================================

alter table public.patient_profiles
  add column if not exists height_cm            numeric(5,1) check (height_cm > 0 and height_cm < 300),
  add column if not exists chronic_conditions   text[] not null default '{}'::text[],
  add column if not exists current_medications  text[] not null default '{}'::text[],
  add column if not exists past_surgeries       text,
  add column if not exists immunizations        text[] not null default '{}'::text[],
  add column if not exists family_history       text,
  add column if not exists smoking_status       text check (smoking_status in ('never','former','current')),
  add column if not exists alcohol_use          text check (alcohol_use    in ('none','occasional','regular','heavy'));
