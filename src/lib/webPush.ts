import { supabase } from '@/lib/supabase';

/**
 * Browser-native Web Push via VAPID.
 *
 * Handles the push channel for every surface the FCM-native path doesn't —
 * iOS Safari PWA (16.4+), desktop Chrome/Edge/Firefox, Android Chrome
 * PWA fallback. The server-side counterpart is in `supabase/functions/
 * send-push/index.ts` where platform='web' tokens are sent via the Web
 * Push protocol instead of FCM.
 *
 * Call `subscribeWebPush(userId)` once the user is signed in. It:
 *   1. Checks capability (SW + PushManager + Notification + VAPID key set)
 *   2. Prompts for notification permission if not already granted
 *   3. Subscribes to the browser's push service using the VAPID public key
 *   4. Serialises the PushSubscription JSON and upserts it as a `web`
 *      platform row in push_tokens
 *
 * `unsubscribeWebPush(userId)` undoes it on sign-out.
 */

const VAPID_PUBLIC_KEY: string | undefined = import.meta.env.VITE_VAPID_PUBLIC_KEY;

const supported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window &&
  !!VAPID_PUBLIC_KEY;

export async function subscribeWebPush(userId: string): Promise<void> {
  if (!supported() || !supabase) return;

  // Permission — if denied earlier the user has to re-grant from site
  // settings; we don't re-prompt.
  if (Notification.permission === 'denied') return;
  if (Notification.permission === 'default') {
    const res = await Notification.requestPermission();
    if (res !== 'granted') return;
  }

  // Service worker — vite-plugin-pwa registers it on load; wait for it.
  const reg = await navigator.serviceWorker.ready;

  // Reuse existing subscription if any; otherwise create one.
  // iOS Safari sometimes rejects the Uint8Array form of applicationServerKey
  // with InvalidAccessError even when the key is a valid P-256 — passing the
  // base64url string works in that case. Try the array form first (fastest
  // path on every other browser) and fall back to the string.
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
    } catch {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY!,
      });
    }
  }

  // Serialise + upsert. We store the full subscription JSON (endpoint, p256dh,
  // auth) in the `token` column so the server can POST to it directly.
  await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token: JSON.stringify(sub.toJSON()),
      platform: 'web',
      device_label: navigator.userAgent.slice(0, 120),
    },
    { onConflict: 'user_id,token' },
  );
}

export async function unsubscribeWebPush(userId: string): Promise<void> {
  if (!supported() || !supabase) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const tokenJson = JSON.stringify(sub.toJSON());
    await supabase.from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', tokenJson);
    await sub.unsubscribe();
  } catch { /* best effort */ }
}

/** VAPID key is URL-safe base64; the PushManager wants a raw Uint8Array. */
function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
