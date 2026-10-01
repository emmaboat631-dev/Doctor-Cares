import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, KeyRound, Mail, User as UserIcon, Stethoscope, HeartPulse, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Alert } from '@/components/ui/Alert';
import { BrandMark } from '@/components/ui/BrandMark';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { PasswordStrength } from '@/components/auth/PasswordStrength';
import { isPasswordValid } from '@/lib/password';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// Splash + Onboarding
// ---------------------------------------------------------------------------

/**
 * App splash — cinematic reveal for ~2.4s, then plays an EXIT animation
 * (camera-pull blur/scale) that overlaps with the onboarding scene entering.
 * The whole splash → onboarding sequence feels like a single video cut.
 * Tap anywhere to skip immediately.
 */
export function SplashPage() {
  const navigate = useNavigate();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Stage 1 (2.4s): trigger exit animation
    const exitAt = setTimeout(() => setExiting(true), 2400);
    // Stage 2 (2.4s + 550ms overlap): actually navigate
    const navAt = setTimeout(() => navigate('/onboarding', { replace: true }), 2950);
    return () => { clearTimeout(exitAt); clearTimeout(navAt); };
  }, [navigate]);

  const skip = () => {
    // On tap: play exit briefly for continuity, then navigate.
    if (exiting) return;
    setExiting(true);
    setTimeout(() => navigate('/onboarding', { replace: true }), 500);
  };

  return (
    // Splash is intentionally dark ALWAYS — never follows the system theme.
    // Inline colors override any inherited `dark:` variant so the branded
    // reveal moment stays consistent for every user, on every device.
    <button
      type="button"
      aria-label="Skip splash"
      onClick={skip}
      style={{ backgroundColor: '#020617' /* slate-950 */, color: '#F8FAFC' /* ink-onDark */ }}
      className="min-h-dvh w-full flex flex-col items-center justify-center px-6 text-center relative overflow-hidden"
    >
      {/* Background gradient — dark forever */}
      <div
        aria-hidden
        className={cn('absolute inset-0', exiting && 'splash-exit-bg')}
        style={{ background: 'radial-gradient(120% 80% at 50% 0%, #0D215E 0%, #020617 60%, #020617 100%)' }}
      />

      {/* Foreground layer — logo, text, orbs — camera-pulls out together */}
      <div className={cn(
        'relative z-10 flex flex-col items-center justify-center min-h-dvh w-full',
        exiting && 'splash-exit',
      )}>
        <span aria-hidden className="splash-orb absolute top-16 left-8 h-28 w-28 rounded-full bg-brand-500/20 blur-2xl" style={{ animationDelay: '0ms' }} />
        <span aria-hidden className="splash-orb absolute bottom-28 right-8 h-36 w-36 rounded-full bg-accent-500/25 blur-3xl" style={{ animationDelay: '1400ms' }} />
        <span aria-hidden className="splash-orb absolute top-1/3 right-14 h-20 w-20 rounded-full bg-brand-500/30 blur-xl" style={{ animationDelay: '700ms' }} />
        <span aria-hidden className="splash-orb absolute bottom-1/3 left-12 h-16 w-16 rounded-full bg-rose-500/20 blur-xl" style={{ animationDelay: '2000ms' }} />

        <div className="relative splash-logo-in">
          <BrandMark size="xl" className="!h-44 !w-44 drop-shadow-2xl" />
        </div>
        <h1 className="mt-8 text-4xl font-bold tracking-tight splash-title-in text-white">Doctor Cares</h1>
        <p className="mt-2 splash-sub-in" style={{ color: '#94A3B8' /* ink-faint */ }}>Healthcare. Anytime. Anywhere.</p>

        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 h-1 w-32 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(148,163,184,0.25)' }}>
          <div className="h-full w-full bg-brand-500 splash-progress rounded-full" />
        </div>
      </div>
    </button>
  );
}

// OnboardingPage lives in its own file (interactive carousel with gestures).
export { OnboardingPage } from './OnboardingPage';

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REMEMBER_EMAIL_KEY = 'dc:remember-email';

export function LoginPage() {
  const { signIn } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? ''; } catch { return ''; }
  });
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
    try { return !!localStorage.getItem(REMEMBER_EMAIL_KEY); } catch { return false; }
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [redirected, setRedirected] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailPattern.test(email))       return setError('Please enter a valid email address.');
    if (password.length < 6)             return setError('Password is too short.');
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await signIn({ email, password });
    setSubmitting(false);
    if (err) return setError(err);
    try {
      if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else          localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch { /* ignore */ }
    setRedirected(true); // AuthProvider updates session → PublicRoute redirects away
  };

  if (redirected) return <Navigate to={from} replace />;

  return (
    <Card padding="lg">
      <div className="mb-6 flex items-center gap-2">
        <BrandMark size="xs" />
        <span className="font-semibold">Doctor Cares</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="text-sm text-ink-muted mt-1">Log in to continue.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
        />

        <div className="flex items-center justify-between -mt-1">
          <label className="flex items-center gap-2 text-sm text-ink-soft dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-400 accent-brand-500"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth size="lg" loading={submitting} leftIcon={<LogIn className="h-4 w-4" />}>
          Log in
        </Button>

        <SocialAuthButtons className="pt-1" />

        <p className="text-center text-sm text-ink-muted">
          No account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor' | 'nurse'>('patient');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2)   return setError('Please enter your full name.');
    if (!emailPattern.test(email))    return setError('Please enter a valid email address.');
    if (!isPasswordValid(password))   return setError('Password doesn\'t meet the requirements below.');
    if (password !== confirm)         return setError('Passwords do not match.');
    if (!agreed)                      return setError('Please accept the Terms and Privacy Policy.');

    setError(undefined);
    setSubmitting(true);
    const { error: err } = await signUp({ email, password, fullName: fullName.trim(), role });
    setSubmitting(false);

    if (err) { setError(err); return; }
    setSuccess(true);
    // If email confirmation is off (dev), Supabase returns an active session
    // and the AuthProvider redirects via PublicRoute. If confirmation is on
    // in prod, this success state is what the user sees.
    setTimeout(() => navigate('/login'), 3500);
  };

  if (success) {
    return (
      <Card padding="lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Account created</h1>
          <p className="mt-1 text-sm text-ink-muted">
            You can sign in now. If email confirmation is on, check your inbox first.
          </p>
          <Link to="/login" className="mt-5 inline-block font-semibold text-brand-600 dark:text-brand-300">
            Continue to log in →
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-6 flex items-center gap-2">
        <BrandMark size="xs" />
        <span className="font-semibold">Doctor Cares</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="text-sm text-ink-muted mt-1">Start using Doctor Cares in minutes.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        {/* Role selector */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">I am a…</span>
          <div className="grid grid-cols-3 gap-2">
            <RoleTile active={role === 'patient'} onClick={() => setRole('patient')}
              icon={<UserIcon className="h-5 w-5" />} label="Patient"
              hint="Book + chat" />
            <RoleTile active={role === 'doctor'} onClick={() => setRole('doctor')}
              icon={<Stethoscope className="h-5 w-5" />} label="Doctor"
              hint="See patients" />
            <RoleTile active={role === 'nurse'} onClick={() => setRole('nurse')}
              icon={<HeartPulse className="h-5 w-5" />} label="Nurse"
              hint="Vitals + care" />
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">Admin accounts are provisioned by the platform team.</p>
        </div>

        <Input
          label="Full name"
          autoComplete="name"
          leftIcon={<UserIcon className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          required
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Pick something you'll remember"
          required
        />
        {password.length > 0 && <PasswordStrength password={password} />}
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          error={confirm.length > 0 && confirm !== password ? 'Passwords do not match yet.' : undefined}
          required
        />

        <label className="flex items-start gap-2.5 text-sm text-ink-soft dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            aria-required="true"
            className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          />
          <span>
            I agree to the{' '}
            <a href="#" className="font-semibold text-brand-600 dark:text-brand-300">Terms</a> and{' '}
            <a href="#" className="font-semibold text-brand-600 dark:text-brand-300">Privacy Policy</a>.
          </span>
        </label>

        <Button type="submit" fullWidth size="lg" loading={submitting} leftIcon={<UserPlus className="h-4 w-4" />}>
          Create account
        </Button>

        <SocialAuthButtons className="pt-1" />

        <p className="text-center text-sm text-ink-muted">
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-300 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </Card>
  );
}

function RoleTile({ active, onClick, icon, label, hint }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'text-left rounded-xl border p-3 transition',
        active
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 ring-2 ring-brand-500/20'
          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-ink dark:text-ink-onDark">
        <span className={cn(
          'grid h-8 w-8 place-items-center rounded-lg',
          active ? 'bg-brand-500 text-white' : 'bg-surface-soft text-ink-soft dark:bg-slate-800 dark:text-slate-300',
        )}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Forgot password
// ---------------------------------------------------------------------------

export function ForgotPasswordPage() {
  const { resetPasswordForEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailPattern.test(email)) return setError('Please enter a valid email address.');
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await resetPasswordForEmail(email);
    setSubmitting(false);
    if (err) setError(err);
    else setSent(true);
  };

  return (
    <Card padding="lg">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-muted">Enter your email and we'll send you a reset link.</p>

      {sent ? (
        <div className="mt-6 space-y-4">
          <Alert tone="success" title="Check your email">
            We've sent a password-reset link to <b>{email}</b>. The link expires in 1 hour.
          </Alert>
          <p className="text-xs text-ink-muted">
            Didn't get it? Check your spam folder, or try again after a minute.
          </p>
          <Link to="/login" className="block text-center font-semibold text-brand-600 dark:text-brand-300">
            ← Back to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Send reset link
          </Button>
          <Link to="/login" className="block text-center text-sm font-medium text-brand-600 dark:text-brand-300">
            ← Back to log in
          </Link>
        </form>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Reset password (after clicking the email link)
// ---------------------------------------------------------------------------

export function ResetPasswordPage() {
  const { updatePassword, passwordRecovery, session, signOut } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  // If someone visits /reset-password directly without coming from the email
  // link, we still let them try (they might have a valid recovery session),
  // but if they aren't authenticated at all, send them to Forgot Password.
  if (!session && !passwordRecovery) {
    return <Navigate to="/forgot-password" replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid(password)) return setError('Password doesn\'t meet the requirements below.');
    if (password !== confirm)       return setError('Passwords do not match.');
    setError(undefined);
    setSubmitting(true);
    const { error: err } = await updatePassword(password);
    setSubmitting(false);
    if (err) return setError(err);
    setDone(true);
  };

  if (done) {
    return (
      <Card padding="lg" className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Password updated</h1>
        <p className="mt-1 text-sm text-ink-muted">You're all set. Sign in with your new password.</p>
        <Button
          className="mt-5"
          onClick={async () => { await signOut(); navigate('/login'); }}
        >
          Go to log in
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-ink-muted">Pick something you haven't used before.</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {password.length > 0 && <PasswordStrength password={password} />}
        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirm.length > 0 && confirm !== password ? 'Passwords do not match yet.' : undefined}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Select role — defensive fallback for signed-in users without a profile row
// ---------------------------------------------------------------------------

export function SelectRolePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRetry = async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  };

  return (
    <Card padding="lg" className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
        <UserIcon className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Preparing your account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        We're finalizing your profile. This usually takes a second.
        {profile ? ' Your role is set — try refreshing.' : ''}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={handleRetry} loading={refreshing}>Refresh</Button>
        <button onClick={signOut} className="text-sm text-ink-muted hover:underline">
          Sign out
        </button>
      </div>
    </Card>
  );
}
