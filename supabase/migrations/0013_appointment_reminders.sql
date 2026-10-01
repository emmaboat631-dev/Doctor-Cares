-- ============================================================================
-- Doctor Cares — 0013 · Appointment reminders
-- ============================================================================
-- Adds the per-appointment "which reminder buckets have fired" tracker and
-- schedules the send-reminders Edge Function every 15 minutes via pg_cron.
--
-- The Edge Function (see supabase/functions/send-reminders/) scans
-- appointments starting ~24h or ~1h from now and pushes a reminder to both
-- parties, flipping the matching key in reminders_sent so a later cron run
-- never duplicates it.
-- ============================================================================

alter table public.appointments
  add column if not exists reminders_sent jsonb not null default '{}'::jsonb;

-- pg_cron + pg_net are both required: pg_cron for the schedule, pg_net for
-- the function to make the outbound HTTP call to send-reminders.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- IMPORTANT: this cron job needs two things set via Supabase Dashboard →
-- Database → Vault (or Edge Function secrets if you prefer):
--   • app.settings.function_url       → https://<project-ref>.supabase.co/functions/v1/send-reminders
--   • app.settings.service_role_key   → the project's service_role JWT
-- See the README for exact SQL to set them, since they contain secrets.

-- Unschedule any previous run of this job so re-applying this migration is
-- idempotent even after the body of the called function changes.
do $$
begin
  perform cron.unschedule('appointment-reminders-15m');
exception
  when others then null;  -- never scheduled yet, fine
end $$;

select
  cron.schedule(
    'appointment-reminders-15m',
    '*/15 * * * *',  -- every 15 minutes
    $job$
    select net.http_post(
      url     := current_setting('app.settings.function_url', true),
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body    := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
    $job$
  );
