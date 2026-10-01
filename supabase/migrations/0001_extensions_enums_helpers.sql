-- ============================================================================
-- Doctor Cares — Phase 2 · 0001 · Extensions, enums, helper functions
-- ============================================================================
-- Applied to a fresh Supabase project via the SQL editor.
-- Idempotent: safe to re-run.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";        -- gen_random_uuid()
create extension if not exists "citext";          -- case-insensitive text (emails)

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('patient', 'doctor', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'pending');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_status as enum
    ('pending', 'confirmed', 'cancelled', 'completed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.appointment_mode as enum ('video', 'clinic', 'home');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum
    ('appointment', 'message', 'system', 'prescription', 'reminder');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_target_type as enum
    ('user', 'appointment', 'message', 'conversation');
exception when duplicate_object then null; end $$;

-- Helper: updated_at trigger --------------------------------------------------
-- Auto-refreshes updated_at on any row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- NOTE: Role-check helpers (current_role, is_admin, is_doctor, is_patient) are
-- defined in migration 0002 — after public.profiles exists — because Postgres
-- validates SQL-language function bodies at creation time.
