/**
 * Idle-timeout controller.
 *
 * The AuthContext starts this on sign-in and stops it on sign-out. Any user
 * activity (pointer, keyboard, touch, scroll, visibility change) resets the
 * clock. When the clock hits `IDLE_MS`, the caller-supplied `onIdle` fires —
 * AuthContext uses that to force a signOut(), which then routes back to
 * /login because of ProtectedRoute's session gate.
 *
 * Chosen defaults: 30 min idle. That's the sweet spot for a healthcare app —
 * long enough that a patient reading a doctor's profile isn't kicked out,
 * short enough that a phone left on a table doesn't stay signed in overnight.
 */

const IDLE_MS = 30 * 60_000;             // 30 minutes of no activity → sign out
const CHECK_EVERY_MS = 30_000;           // Re-check every 30s (cheap wall-clock diff)
const WINDOW_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll',
];

let lastActivityAt = Date.now();
let interval: ReturnType<typeof setInterval> | null = null;
let onIdleCb: (() => void) | null = null;

const bump = () => { lastActivityAt = Date.now(); };

const tick = () => {
  if (!onIdleCb) return;
  // `visibilityState` counts as activity when the tab becomes visible —
  // otherwise a user coming back from another app is immediately booted.
  if (document.visibilityState === 'visible' && Date.now() - lastActivityAt < 5_000) return;
  if (Date.now() - lastActivityAt >= IDLE_MS) {
    const cb = onIdleCb;
    stopIdleTimer();       // stop before firing so a re-entrant signOut doesn't loop
    cb?.();
  }
};

export function startIdleTimer(onIdle: () => void): void {
  if (interval) return;    // already running
  onIdleCb = onIdle;
  lastActivityAt = Date.now();
  WINDOW_EVENTS.forEach((e) => window.addEventListener(e, bump, { passive: true }));
  document.addEventListener('visibilitychange', bump);
  interval = setInterval(tick, CHECK_EVERY_MS);
}

export function stopIdleTimer(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
  onIdleCb = null;
  WINDOW_EVENTS.forEach((e) => window.removeEventListener(e, bump));
  document.removeEventListener('visibilitychange', bump);
}
