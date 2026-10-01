import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { isNative, nativePlatform } from './platform';

/**
 * Push notifications flow (Android/iOS via FCM):
 *   1. On sign-in — `registerForPush(userId)` asks the OS for permission,
 *      then hands us back an FCM token which we upsert into push_tokens.
 *   2. On sign-out — `unregisterFromPush(userId)` deletes that row so the
 *      ex-user's device doesn't keep receiving pushes.
 *   3. Foreground receipt — realtime channels already update the UI, so we
 *      do nothing visible for a push that arrives while the app is open.
 *   4. Background tap — if the push payload includes a `data.route`, we
 *      deep-link to that URL after the app resumes.
 *
 * All calls are guarded by isNative() — the web build is a no-op.
 */

let lastToken: string | null = null;
let listenersAttached = false;

export async function registerForPush(userId: string): Promise<void> {
  if (!isNative()) return;

  const perm = await PushNotifications.checkPermissions();
  let granted = perm.receive === 'granted';
  if (!granted) {
    const req = await PushNotifications.requestPermissions();
    granted = req.receive === 'granted';
  }
  if (!granted) return;

  attachListenersOnce(userId);
  await PushNotifications.register();
}

export async function unregisterFromPush(userId: string): Promise<void> {
  if (!isNative() || !supabase || !lastToken) return;
  try {
    await supabase.from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', lastToken);
  } catch { /* best effort — token will age out server-side anyway */ }
  lastToken = null;
}

function attachListenersOnce(userId: string) {
  if (listenersAttached) return;
  listenersAttached = true;

  PushNotifications.addListener('registration', async (token) => {
    lastToken = token.value;
    if (!supabase) return;
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token: token.value, platform: nativePlatform() },
      { onConflict: 'user_id,token' },
    );
  });

  PushNotifications.addListener('registrationError', (err) => {
    // Non-fatal: user just won't get push. Log for diagnostics.
    console.warn('Push registration error', err);
  });

  PushNotifications.addListener('pushNotificationReceived', () => {
    // Foreground — realtime already updates the UI; nothing to do.
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Background tap — follow the payload's deep-link if present.
    const route = action?.notification?.data?.route as string | undefined;
    if (route) window.location.assign(route);
  });
}
