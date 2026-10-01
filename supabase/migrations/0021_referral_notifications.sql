-- ============================================================================
-- Doctor Cares — 0021 · In-app notifications for referrals
-- ============================================================================
-- Writes rows into public.notifications when a referral is created or its
-- status changes. Separate from the push broadcast added in 0020 — the
-- bell icon in the app reads from notifications, so without this trigger
-- a referral is invisible in-app until the user opens /referrals directly.
-- ============================================================================

-- Add 'referral' to the notification_type enum if it isn't there yet.
do $$ begin
  alter type public.notification_type add value if not exists 'referral';
exception when duplicate_object then null; end $$;

create or replace function public.notify_on_referral_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  from_name text;
  to_name   text;
begin
  if tg_op = 'INSERT' then
    select full_name into from_name from public.profiles where id = new.from_doctor_id;
    insert into public.notifications (user_id, type, title, body, href, metadata)
    values (
      new.to_doctor_id,
      'referral',
      'New referral',
      coalesce('From Dr. ' || from_name || ': ', '') || new.reason,
      '/referrals',
      jsonb_build_object('referral_id', new.id, 'status', new.status)
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'accepted' then
      select full_name into to_name from public.profiles where id = new.to_doctor_id;
      insert into public.notifications (user_id, type, title, body, href, metadata)
      values (
        new.patient_id,
        'referral',
        'Referral accepted',
        'Dr. ' || coalesce(to_name, 'the specialist') || ' accepted your referral.',
        '/referrals',
        jsonb_build_object('referral_id', new.id, 'status', 'accepted')
      );
      -- Also tell the sending doctor
      insert into public.notifications (user_id, type, title, body, href, metadata)
      values (
        new.from_doctor_id,
        'referral',
        'Referral accepted',
        'Dr. ' || coalesce(to_name, 'the specialist') || ' accepted your referral.',
        '/referrals',
        jsonb_build_object('referral_id', new.id, 'status', 'accepted')
      );
    elsif new.status = 'declined' then
      select full_name into to_name from public.profiles where id = new.to_doctor_id;
      insert into public.notifications (user_id, type, title, body, href, metadata)
      values (
        new.from_doctor_id,
        'referral',
        'Referral declined',
        'Dr. ' || coalesce(to_name, 'the specialist') || ' declined the referral.',
        '/referrals',
        jsonb_build_object('referral_id', new.id, 'status', 'declined')
      );
    elsif new.status = 'completed' then
      insert into public.notifications (user_id, type, title, body, href, metadata)
      values (
        new.from_doctor_id,
        'referral',
        'Referral completed',
        'The follow-up with the specialist is complete.',
        '/referrals',
        jsonb_build_object('referral_id', new.id, 'status', 'completed')
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists referrals_notify_inapp on public.referrals;
create trigger referrals_notify_inapp
  after insert or update on public.referrals
  for each row execute function public.notify_on_referral_change();
