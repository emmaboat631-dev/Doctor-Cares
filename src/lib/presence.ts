import { supabase } from '@/lib/supabase';

const HEARTBEAT_MS = 60_000; // update last_seen_at once a minute
const ONLINE_WINDOW_MS = 2 * 60_000; // "Online" if seen within 2 minutes
let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the presence heartbeat. Called once from AuthContext when a user
 * signs in; stopped on sign-out. Also flushes a tick immediately on
 * visibilitychange → visible so the badge updates when the user brings the
 * app back to the foreground.
 */
export function startPresenceHeartbeat(): void {
  if (timer) return;
  const tick = async () => {
    try { await supabase?.rpc('touch_last_seen'); } catch { /* offline is fine */ }
  };
  tick();
  timer = setInterval(tick, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', onVisibility);
}

export function stopPresenceHeartbeat(): void {
  if (timer) { clearInterval(timer); timer = null; }
  document.removeEventListener('visibilitychange', onVisibility);
}

/**
 * Fetch a specific user's `last_seen_at` value directly, bypassing any
 * joined-query caching. The chat header uses this on a poll so the
 * Online/Last-seen badge stays accurate even when the underlying
 * conversation payload is served from a stale HTTP cache.
 */
export async function fetchLastSeenAt(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('last_seen_at')
    .eq('id', userId)
    .maybeSingle();
  return (data?.last_seen_at as string | null | undefined) ?? null;
}

async function onVisibility() {
  if (document.visibilityState === 'visible') {
    try { await supabase?.rpc('touch_last_seen'); } catch { /* fine */ }
  }
}

/**
 * Format a presence badge line for a chat header / user card.
 *   null / undefined → "Offline"
 *   within 2 min     → "Online"
 *   older            → "Last seen <relative>"
 */
export function formatPresence(lastSeenAt: string | null | undefined): {
  label: string;
  isOnline: boolean;
} {
  if (!lastSeenAt) return { label: 'Offline', isOnline: false };
  const ageMs = Date.now() - new Date(lastSeenAt).getTime();
  if (ageMs < ONLINE_WINDOW_MS) return { label: 'Online', isOnline: true };
  return { label: `Last seen ${relative(ageMs)}`, isOnline: false };
}

function relative(ageMs: number): string {
  const s = Math.round(ageMs / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  return `${w}w ago`;
}
