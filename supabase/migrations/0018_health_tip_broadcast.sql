-- ============================================================================
-- Doctor Cares — 0018 · Health-tip broadcast trigger
-- ============================================================================
-- When a health tip is newly published (insert with is_published=true, or an
-- update that flips the flag false→true), POST to send-push via pg_net so
-- every active patient gets "New health tip: <title>".
--
-- Reuses the same app.settings.function_url / service_role_key already set
-- for the appointment-reminders cron in migration 0013. The function_url
-- setting there points at send-reminders; here we need send-push instead,
-- so we derive it from the same base URL by swapping the suffix.
-- ============================================================================

create extension if not exists pg_net with schema extensions;

create or replace function public.broadcast_health_tip()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_url text;
  push_url text;
begin
  -- Only broadcast when newly published
  if new.is_published is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' and (old.is_published is true) then
    return new;
  end if;

  base_url := current_setting('app.settings.function_url', true);
  if base_url is null then
    raise warning 'broadcast_health_tip: app.settings.function_url not set';
    return new;
  end if;
  -- function_url is set to the send-reminders URL; swap the last path segment.
  push_url := regexp_replace(base_url, '/[^/]+$', '/send-push');

  perform net.http_post(
    url     := push_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := jsonb_build_object(
      'type',   tg_op,
      'table',  'health_tips',
      'record', row_to_json(new),
      'old_record', case when tg_op = 'UPDATE' then row_to_json(old) else null end
    ),
    timeout_milliseconds := 10000
  );
  return new;
end;
$$;

drop trigger if exists health_tips_broadcast on public.health_tips;
create trigger health_tips_broadcast
  after insert or update on public.health_tips
  for each row execute function public.broadcast_health_tip();
