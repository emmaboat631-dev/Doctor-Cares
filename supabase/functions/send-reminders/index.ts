// ============================================================================
// Doctor Cares — Edge Function · send-reminders
// ============================================================================
// Fires on a pg_cron schedule (every 15 min). Finds every pending/confirmed
// appointment that starts within one of two windows:
//
//   * 24h ± 15 min  → "Reminder: your appointment is tomorrow at 2:00 PM"
//   * 1h  ± 15 min  → "Reminder: your appointment starts in 1 hour"
//
// Uses the appointments.reminders_sent jsonb column to track which windows
// have already been reminded for each row, so a cron run never duplicates
// a notification. Pushes go through the same FCM + VAPID stack the
// send-push function already uses — we just call send-push internally for
// each (user, title, body, route) tuple instead of re-implementing push
// delivery here.
// ============================================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  status: string;
  reminders_sent: Record<string, boolean> | null;
}

serve(async () => {
  const now = Date.now();
  // Look at a ~26h window ahead — covers both the 24h and 1h buckets.
  const horizonIso = new Date(now + 26 * 60 * 60_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, patient_id, doctor_id, scheduled_at, status, reminders_sent')
    .in('status', ['pending', 'confirmed'])
    .gte('scheduled_at', nowIso)
    .lte('scheduled_at', horizonIso);
  if (error) {
    console.error('[send-reminders] query failed', error);
    return new Response('query failed', { status: 500 });
  }

  let sent = 0;
  for (const a of (appts ?? []) as Appointment[]) {
    const minsUntil = (new Date(a.scheduled_at).getTime() - now) / 60_000;
    const already = a.reminders_sent ?? {};

    const bucket =
      minsUntil >= 24 * 60 - 15 && minsUntil <= 24 * 60 + 15 ? '24h' :
      minsUntil >= 60 - 15      && minsUntil <= 60 + 15      ? '1h'  :
      null;

    if (!bucket || already[bucket]) continue;

    const niceTime = new Date(a.scheduled_at).toLocaleString('en-GB', {
      hour: 'numeric', minute: '2-digit', hour12: true,
      weekday: 'short', month: 'short', day: 'numeric',
      timeZone: 'UTC',
    });

    const title = bucket === '24h'
      ? 'Appointment tomorrow'
      : 'Appointment in 1 hour';
    const body = bucket === '24h'
      ? `Reminder: your visit is scheduled for ${niceTime}.`
      : `Your visit starts in about 1 hour (${niceTime}).`;

    // Push to BOTH parties — patient and doctor each want the reminder.
    await Promise.allSettled([
      invokeSendPush(a.patient_id, title, body, `/appointments/${a.id}`),
      invokeSendPush(a.doctor_id,  title, body, `/appointments/${a.id}`),
    ]);

    await supabase
      .from('appointments')
      .update({ reminders_sent: { ...already, [bucket]: true } })
      .eq('id', a.id);

    sent++;
  }

  return new Response(JSON.stringify({ scanned: appts?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function invokeSendPush(userId: string, title: string, body: string, route: string) {
  // Reuse the deployed send-push function so FCM + VAPID logic stays in one
  // place. The payload mirrors a Database Webhook row insert so send-push's
  // existing router handles it.
  const url = `${SUPABASE_URL}/functions/v1/send-push`;
  const payload = {
    type: 'INSERT',
    table: 'reminders',       // not a real table — just a hint for logs
    record: { user_id: userId, title, body, route },
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn('[send-reminders] invoke send-push failed', e);
  }
}
