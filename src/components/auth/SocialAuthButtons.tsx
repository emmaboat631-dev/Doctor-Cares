import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/cn';

/**
 * "Continue with Google / Apple" buttons using Supabase OAuth.
 * Both providers must be enabled in Supabase Auth → Providers to work.
 */
export function SocialAuthButtons({ className }: { className?: string }) {
  const { signInWithOAuth } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | undefined>();

  const handle = async (provider: 'google' | 'apple') => {
    setBusy(provider);
    setError(undefined);
    const { error: err } = await signInWithOAuth(provider);
    if (err) { setError(err); setBusy(null); }
    // On success the browser redirects to Google/Apple, so no need to unset busy.
  };

  return (
    <div className={cn('space-y-2', className)}>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">or continue with</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SocialBtn onClick={() => handle('google')} loading={busy === 'google'} disabled={busy !== null}>
          <GoogleG />
          Google
        </SocialBtn>
        <SocialBtn onClick={() => handle('apple')} loading={busy === 'apple'} disabled={busy !== null}>
          <AppleLogo />
          Apple
        </SocialBtn>
      </div>
    </div>
  );
}

function SocialBtn({
  onClick, loading, disabled, children,
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition',
        'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900',
        'text-ink dark:text-ink-onDark',
        'hover:bg-slate-50 dark:hover:bg-slate-800',
        'active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      ) : (
        children
      )}
    </button>
  );
}

// -- Real brand marks -------------------------------------------------------

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg width="16" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor" className="text-ink dark:text-ink-onDark">
      <path d="M17.564 12.4c-.02-2.026 1.653-2.998 1.728-3.045-.943-1.379-2.406-1.567-2.924-1.586-1.243-.126-2.427.734-3.058.734-.63 0-1.607-.716-2.643-.695-1.359.02-2.615.79-3.313 2.005-1.413 2.45-.361 6.075 1.014 8.06.674.973 1.478 2.062 2.53 2.023 1.017-.041 1.402-.657 2.631-.657 1.229 0 1.575.657 2.647.638 1.095-.019 1.79-.986 2.462-1.965.775-1.127 1.093-2.221 1.113-2.277-.024-.011-2.135-.819-2.156-3.235zM15.53 6.19c.552-.67.925-1.596.823-2.523-.795.033-1.759.53-2.328 1.198-.51.591-.958 1.541-.838 2.447.888.069 1.79-.451 2.343-1.122z"/>
    </svg>
  );
}
