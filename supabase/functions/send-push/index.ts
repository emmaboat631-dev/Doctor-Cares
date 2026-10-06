// ============================================================================
// Doctor Cares — Edge Function · send-push
// ============================================================================
// Trigger:  Database Webhook on public.messages INSERT and public.appointments
//           INSERT / UPDATE (status change). Configure both in Supabase
//           Dashboard → Database → Webhooks with URL pointing at this function.
//
// Payload:  Supabase's standard webhook envelope
//           { type: 'INSERT'|'UPDATE', table: '...', record: {...}, old_record?: {...} }
//
// Auth:     FIREBASE_SERVICE_ACCOUNT env var (JSON string of a Firebase
//           service account key with cloudmessaging.send scope). Set with:
//             supabase secrets set FIREBASE_SERVICE_ACCOUNT="$(cat sa.json)"
//
// The function looks up who should be notified (the recipient of a message,
// or the patient when an appointment flips to confirmed/rejected/cancelled),
// fetches their push_tokens, and sends one FCM v1 request per token.
// ============================================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// esm.sh transpiles web-push for Deno; the raw `npm:web-push` specifier
// fails because web-push reaches into Node's `http` module directly.
import webpush from 'https://esm.sh/web-push@3.6.7?target=denonext';

interface Payload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SA_JSON = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!;

// Web Push (VAPID) — used for iOS Safari PWA + desktop browsers.
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@doctor-cares.app';
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// -- FCM v1 access-token cache -----------------------------------------------
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const sa = JSON.parse(SA_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  const signInput = `${b64(header)}.${b64(claim)}`;
  const pem = (sa.private_key as string).replace(/-----[^-]+-----|\n/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signInput),
  ));
  const sigB64 = btoa(String.fromCharCode(...sig))
    .replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_');
  const jwt = `${signInput}.${sigB64}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const { access_token, expires_in } = await res.json();
  cachedToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}

// -- Push send ---------------------------------------------------------------
async function sendPush(userId: string, title: string, body: string, route?: string) {
  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', userId);

  console.log(`[sendPush] user=${userId} title="${title}" tokens=${tokens?.length ?? 0}`);
  if (error) console.error('[sendPush] token fetch error:', error.message);
  if (!tokens?.length) {
    console.warn(`[sendPush] no tokens for user ${userId} — nothing to send`);
    return;
  }

  const results = await Promise.allSettled(tokens.map((t) =>
    t.platform === 'web'
      ? sendWebPush(t.token, title, body, route)
      : sendFcm(t.token, title, body, route),
  ));
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[sendPush] token ${i} (${tokens[i].platform}) rejected:`, r.reason);
    } else {
      console.log(`[sendPush] token ${i} (${tokens[i].platform}) sent OK`);
    }
  });
}

/** FCM — Android native app + Android Chrome tokens. */
async function sendFcm(token: string, title: string, body: string, route?: string) {
  if (!SA_JSON) { console.error('[sendFcm] FIREBASE_SERVICE_ACCOUNT secret missing'); return; }
  let sa;
  try { sa = JSON.parse(SA_JSON); } catch (e) {
    console.error('[sendFcm] FIREBASE_SERVICE_ACCOUNT is not valid JSON:', (e as Error).message);
    return;
  }
  const accessToken = await getAccessToken();
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: route ? { route } : {},
        android: {
          priority: 'HIGH',
          notification: {
            image: 'https://doctor-cares-ten.vercel.app/brand-illustration.png',
            icon: 'ic_notification',
            color: '#1E5EFF',
          },
        },
      },
    }),
  });
  const bodyText = await res.text();
  // Log status only — the FCM response body can echo the recipient token
  // on certain errors, which would leak into Supabase function logs.
  // On HTTP errors we log a redacted preview with any FCM-token-shaped
  // substrings replaced.
  if (res.status >= 400) {
    const redacted = bodyText.replace(/[A-Za-z0-9_-]{140,}/g, '[REDACTED-TOKEN]').slice(0, 300);
    console.error(`[sendFcm] status=${res.status} body=${redacted}`);
  } else {
    console.log(`[sendFcm] status=${res.status}`);
  }
  // 404 / UNREGISTERED → token dead, prune it
  if (res.status === 404) {
    await supabase.from('push_tokens').delete().eq('token', token);
  }
}

/** Web Push — iOS Safari PWA, desktop Chrome/Edge/Firefox. */
async function sendWebPush(token: string, title: string, body: string, route?: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  let subscription;
  try { subscription = JSON.parse(token); } catch { return; }

  const payload = JSON.stringify({ title, body, route: route ?? '/' });
  try {
    await webpush.sendNotification(subscription, payload, { TTL: 60 });
  } catch (e: unknown) {
    const err = e as { statusCode?: number };
    // 404 Not Found or 410 Gone → the subscription is dead, prune it.
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await supabase.from('push_tokens').delete().eq('token', token);
    }
  }
}

// -- Router ------------------------------------------------------------------
serve(async (req) => {
  try {
    const payload = (await req.json()) as Payload;

    if (payload.table === 'messages' && payload.type === 'INSERT') {
      const msg = payload.record as { conversation_id: string; sender_id: string; body: string };
      // Recipient = the other party of the conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('patient_id, doctor_id')
        .eq('id', msg.conversation_id)
        .single();
      if (!conv) return new Response('conv not found', { status: 404 });
      const recipient = conv.patient_id === msg.sender_id ? conv.doctor_id : conv.patient_id;
      const { data: sender } = await supabase
        .from('profiles').select('full_name').eq('id', msg.sender_id).single();
      await sendPush(
        recipient,
        sender?.full_name ?? 'New message',
        msg.body.slice(0, 140),
        `/chat/${msg.conversation_id}`,
      );
      return new Response('ok');
    }

    // Direct push — called by send-reminders (or anything else) with a
    // handcrafted (user_id, title, body, route) tuple. Not fired by any DB
    // webhook, so no `old_record`.
    if (payload.table === 'reminders' && payload.type === 'INSERT') {
      const r = payload.record as { user_id: string; title: string; body: string; route?: string };
      await sendPush(r.user_id, r.title, r.body, r.route);
      return new Response('ok');
    }

    if (payload.table === 'appointments') {
      const appt = payload.record as { id: string; patient_id: string; doctor_id: string; status: string };
      const old = payload.old_record as { status?: string } | undefined;
      // Only push when status actually changed (or on INSERT).
      if (payload.type === 'UPDATE' && old?.status === appt.status) return new Response('nochange');

      // Pull the doctor's name so the body can address the patient personally.
      const { data: doc } = await supabase
        .from('profiles').select('full_name').eq('id', appt.doctor_id).single();
      const docName = doc?.full_name ?? 'your doctor';

      let title = '';
      let body = '';
      let route = `/appointments/${appt.id}`;
      switch (appt.status) {
        case 'pending':   title = 'New booking request'; body = 'A patient booked a slot.'; break;
        case 'confirmed': title = 'Appointment confirmed'; body = `Dr. ${docName} accepted your booking.`; break;
        case 'rejected':  title = 'Appointment declined'; body = `Dr. ${docName} could not take this slot.`; break;
        case 'cancelled': title = 'Appointment cancelled'; body = 'This appointment was cancelled.'; break;
        case 'completed':
          title = 'How was your visit?';
          body  = `Rate your visit with Dr. ${docName}.`;
          route = `/appointments/${appt.id}/review`;
          break;
        default: return new Response('unhandled status');
      }
      const notifyUser = appt.status === 'pending' ? appt.doctor_id : appt.patient_id;
      await sendPush(notifyUser, title, body, route);
      return new Response('ok');
    }

    // Referral events: notify the target doctor on new referral; notify the
    // patient when the target doctor accepts.
    if (payload.table === 'referrals') {
      const r = payload.record as {
        id: string; patient_id: string; from_doctor_id: string;
        to_doctor_id: string; reason: string; status: string;
      };
      const old = payload.old_record as { status?: string } | undefined;

      if (payload.type === 'INSERT') {
        const { data: from } = await supabase
          .from('profiles').select('full_name').eq('id', r.from_doctor_id).single();
        await sendPush(
          r.to_doctor_id,
          'New referral',
          `Dr. ${from?.full_name ?? 'A colleague'}: ${r.reason}`,
          '/referrals',
        );
        return new Response('ok');
      }
      if (payload.type === 'UPDATE' && old?.status !== r.status && r.status === 'accepted') {
        const { data: to } = await supabase
          .from('profiles').select('full_name').eq('id', r.to_doctor_id).single();
        await sendPush(
          r.patient_id,
          'Referral accepted',
          `Dr. ${to?.full_name ?? 'The specialist'} accepted your referral — you can book now.`,
          '/referrals',
        );
        return new Response('ok');
      }
      return new Response('nochange');
    }

    // Health tip broadcast — one push to EVERY patient when a tip is newly
    // published (either an INSERT with is_published=true, or an UPDATE that
    // flips is_published from false → true). Driven by migration 0018's
    // trigger, which POSTs this envelope to send-push via pg_net.
    if (payload.table === 'health_tips') {
      const tip = payload.record as { id: string; title: string; is_published: boolean };
      const old = payload.old_record as { is_published?: boolean } | undefined;
      const wasPublished = old?.is_published ?? false;
      const isNowPublished = tip.is_published === true;
      if (!isNowPublished) return new Response('not published');
      if (payload.type === 'UPDATE' && wasPublished === true) return new Response('already published');

      // Fetch every active patient's user id. We fan out from here because
      // webhooks only fire once per changed row.
      const { data: patients } = await supabase
        .from('profiles').select('id').eq('role', 'patient').eq('status', 'active');
      if (!patients?.length) return new Response('no patients');

      await Promise.allSettled(patients.map((p) =>
        sendPush(p.id, 'New health tip', tip.title, `/tips/${tip.id}`),
      ));
      return new Response('ok');
    }

    return new Response('ignored');
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
