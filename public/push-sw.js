/**
 * Web Push handlers — appended to the generated service worker via Workbox's
 * `importScripts` option (see vite.config.ts). The main SW handles caching
 * and offline; this one listens for push events delivered by the Web Push
 * protocol and shows a system notification. On click, it either focuses an
 * existing open tab or opens a new one to the deep-link route.
 *
 * Payload shape (set by the send-push Edge Function):
 *   { title: string, body: string, route?: string }
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'Doctor Cares', body: '', route: '/' };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch (_) {
    // Non-JSON payload — fall back to plain text in body.
    try { payload.body = event.data.text(); } catch (_) { /* ignore */ }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/brand-illustration.png',
      badge: '/brand-illustration.png',
      data: { route: payload.route || '/' },
      // On iOS this unlocks the native-style notification UI; harmless elsewhere.
      requireInteraction: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = (event.notification.data && event.notification.data.route) || '/';
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // If an app window is already open, focus it and navigate.
      for (const client of allClients) {
        try {
          await client.focus();
          if ('navigate' in client) await client.navigate(route);
          return;
        } catch (_) { /* try next */ }
      }
      // Otherwise open a fresh window.
      if (self.clients.openWindow) await self.clients.openWindow(route);
    })(),
  );
});
