import { supabase } from '@/lib/supabase';

/**
 * Minimal offline write queue. Operations we want to survive a network drop
 * (chat messages, metric logs) go through here instead of calling Supabase
 * directly. The queue persists in localStorage and flushes automatically on
 * `online` events and on app boot.
 *
 * This is intentionally simple — only a handful of mutation types are
 * supported, no retries with exponential backoff. If a flush fails the item
 * stays on the queue and tries again on the next online event.
 */

type QueueItem =
  | { kind: 'message'; conversationId: string; senderId: string; body: string; attemptedAt: string; id: string }
  | { kind: 'metric'; userId: string; type: string; value: number; value2: number | null; unit: string; takenAt: string; notes: string | null; id: string };

const KEY = 'doctor-cares.offline-queue.v1';
let flushing = false;

function read(): QueueItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as QueueItem[]; }
  catch { return []; }
}

function write(items: QueueItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full */ }
}

function enqueue(item: QueueItem) {
  const items = read();
  items.push(item);
  write(items);
  // Fire-and-forget flush attempt — most of the time we ARE online and the
  // queue drains immediately after enqueue.
  void flush();
}

/** Queue a chat message. Returns the client-side id so UI can show pending state. */
export function queueMessage(args: { conversationId: string; senderId: string; body: string }): string {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  enqueue({ kind: 'message', ...args, attemptedAt: new Date().toISOString(), id });
  return id;
}

/** Queue a metric log. */
export function queueMetric(args: {
  userId: string; type: string; value: number; value2: number | null;
  unit: string; takenAt: string; notes: string | null;
}): string {
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  enqueue({ kind: 'metric', ...args, id });
  return id;
}

export function pendingCount(): number {
  return read().length;
}

/** Attempt to drain the queue. No-op when offline. */
export async function flush(): Promise<void> {
  if (flushing) return;
  if (!navigator.onLine) return;
  if (!supabase) return;
  const items = read();
  if (items.length === 0) return;
  flushing = true;
  const sb = supabase;
  const remaining: QueueItem[] = [];
  for (const item of items) {
    try {
      if (item.kind === 'message') {
        const { error } = await sb.from('messages').insert({
          conversation_id: item.conversationId,
          sender_id: item.senderId,
          body: item.body,
        });
        if (error) throw error;
      } else if (item.kind === 'metric') {
        const { error } = await sb.from('health_metrics').insert({
          user_id: item.userId,
          type: item.type,
          value: item.value,
          value2: item.value2,
          unit: item.unit,
          taken_at: item.takenAt,
          notes: item.notes,
        });
        if (error) throw error;
      }
    } catch {
      // Keep it on the queue; try again on next online event.
      remaining.push(item);
    }
  }
  write(remaining);
  flushing = false;
}

/**
 * Install the online-event listener. Call once from main.tsx so the queue
 * drains automatically whenever the device comes back online.
 */
export function installOfflineQueue(): void {
  window.addEventListener('online', () => { void flush(); });
  // Also flush on app boot in case we have leftover items from the last run.
  if (navigator.onLine) void flush();
}
