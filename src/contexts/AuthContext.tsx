import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { readEnvSafe } from '@/lib/env';
import { markOnboardingSeen } from '@/lib/onboarding';
import { startPresenceHeartbeat, stopPresenceHeartbeat } from '@/lib/presence';
import { startIdleTimer, stopIdleTimer } from '@/lib/idleTimeout';
import type { Profile, UserRole } from '@/types';

type AsyncResult = { error?: string };

interface AuthContextValue {
  loading: boolean;
  /** True while we're still fetching the profile row for a fresh session. */
  profileLoading: boolean;
  /** True once loadProfile has completed at least once for the current session. */
  profileLoaded: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  /** True when the current session came from a "reset password" email link. */
  passwordRecovery: boolean;
  refreshProfile: () => Promise<void>;
  signUp: (params: { email: string; password: string; fullName: string; role: 'patient' | 'doctor' | 'nurse'; captchaToken?: string }) => Promise<AsyncResult>;
  signIn: (params: { email: string; password: string; captchaToken?: string }) => Promise<AsyncResult>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<AsyncResult>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string, captchaToken?: string) => Promise<AsyncResult>;
  updatePassword: (newPassword: string) => Promise<AsyncResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Map Supabase auth error codes to short human-readable messages. */
const humanError = (error: AuthError | null | undefined): string | undefined => {
  if (!error) return undefined;
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (msg.includes('email not confirmed'))       return 'Please confirm your email first.';
  if (msg.includes('user already registered'))   return 'An account with that email already exists.';
  if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('password') && msg.includes('short'))
    return 'Password is too short (min 6 characters).';
  if (msg.includes('network') || msg.includes('failed to fetch'))
    return 'Network error — check your connection and try again.';
  return error.message;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) { setProfile(null); return; }
      setProfile(data ?? null);
    } finally {
      setProfileLoading(false);
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // Kick the idle timer once we know the user is signed in. The callback
    // signs out on inactivity, which flips the session to null and
    // ProtectedRoute redirects to /login automatically.
    const onIdleSignOut = () => {
      if (!supabase) return;
      supabase.auth.signOut().catch(() => { /* best-effort */ });
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        markOnboardingSeen();
        await loadProfile(data.session.user.id);
        startPresenceHeartbeat();
        startIdleTimer(onIdleSignOut);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        stopPresenceHeartbeat();
        stopIdleTimer();
        // Best-effort — remove the current device's push token so ex-user
        // stops getting pushes. Dynamic import avoids pulling native code
        // into the web bundle unless it actually runs.
        const prevUser = session?.user?.id;
        if (prevUser) {
          import('@/lib/native/push').then(({ unregisterFromPush }) =>
            unregisterFromPush(prevUser),
          ).catch(() => { /* ignore */ });
          import('@/lib/webPush').then(({ unsubscribeWebPush }) =>
            unsubscribeWebPush(prevUser),
          ).catch(() => { /* ignore */ });
        }
      }
      if (next?.user) {
        markOnboardingSeen();
        await loadProfile(next.user.id);
        startPresenceHeartbeat();
        startIdleTimer(onIdleSignOut);
        // Push: FCM on native, Web Push (VAPID) in the browser. Each module
        // short-circuits when it's on the wrong platform, so firing both here
        // is safe — only one actually registers a token per device.
        import('@/lib/native/push').then(({ registerForPush }) =>
          registerForPush(next.user!.id),
        ).catch(() => { /* ignore */ });
        import('@/lib/webPush').then(({ subscribeWebPush }) =>
          subscribeWebPush(next.user!.id),
        ).catch(() => { /* ignore */ });
      } else {
        setProfile(null);
        setProfileLoaded(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    profileLoading,
    profileLoaded,
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    passwordRecovery,

    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },

    signUp: async ({ email, password, fullName, role, captchaToken }) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const env = readEnvSafe();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, full_name: fullName },
          emailRedirectTo: env ? `${env.appUrl}/login` : undefined,
          captchaToken,
        },
      });
      return { error: humanError(error) };
    },

    signIn: async ({ email, password, captchaToken }) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const { error } = await supabase.auth.signInWithPassword({
        email, password, options: { captchaToken },
      });
      return { error: humanError(error) };
    },

    signInWithOAuth: async (provider) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const env = readEnvSafe();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: env ? `${env.appUrl}/` : undefined,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('provider') && msg.includes('not enabled')) {
          return { error: `${provider === 'google' ? 'Google' : 'Apple'} sign-in isn't turned on in Supabase yet. Ask an admin to enable it in Authentication → Providers.` };
        }
        return { error: humanError(error) };
      }
      return {};
    },

    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },

    resetPasswordForEmail: async (email, captchaToken) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const env = readEnvSafe();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: env ? `${env.appUrl}/reset-password` : undefined,
        captchaToken,
      });
      return { error: humanError(error) };
    },

    updatePassword: async (newPassword) => {
      if (!supabase) return { error: 'Supabase is not configured.' };
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) setPasswordRecovery(false);
      return { error: humanError(error) };
    },
  }), [loading, profileLoading, profileLoaded, session, profile, passwordRecovery, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
