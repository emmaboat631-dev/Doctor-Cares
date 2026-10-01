/**
 * Central env accessor. Fails loudly at first use if required vars are missing
 * so a misconfigured deployment doesn't silently fall back to a broken state.
 */

interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  adminEmails: string[];
}

const readAdminEmails = () =>
  (import.meta.env.VITE_ADMIN_EMAILS ?? '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

const readEnv = (): Env => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error('Missing environment variable VITE_SUPABASE_URL');
  if (!supabaseAnonKey) throw new Error('Missing environment variable VITE_SUPABASE_ANON_KEY');
  return {
    supabaseUrl,
    supabaseAnonKey,
    appUrl: import.meta.env.VITE_APP_URL ?? window.location.origin,
    adminEmails: readAdminEmails(),
  };
};

/**
 * Never throws. Returns null when env is not configured so the app can render
 * a friendly setup screen instead of a hard crash on first boot.
 */
export const readEnvSafe = (): Env | null => {
  try {
    return readEnv();
  } catch {
    return null;
  }
};

/** Throws if missing — use only after `isSupabaseConfigured` is true. */
export const requireEnv = (): Env => readEnv();
