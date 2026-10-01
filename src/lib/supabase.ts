import { createClient } from '@supabase/supabase-js';
import { readEnvSafe } from './env';

const env = readEnvSafe();

/**
 * Supabase client. Null when environment variables are not configured,
 * so the app can render a friendly setup screen instead of crashing.
 *
 * Untyped intentionally — our concrete Row/Insert/Update types live in
 * `src/lib/api/*` so each query function is a typed boundary. Wiring the
 * whole Database generic here fights supabase-js's inference for hand-
 * written type shims. Regenerate with `supabase gen types typescript` later
 * for full typing.
 */
export const supabase = env
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: { eventsPerSecond: 8 },
      },
    })
  : null;

export const isSupabaseConfigured = supabase !== null;
