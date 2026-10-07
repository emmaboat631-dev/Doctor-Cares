import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

const KEY = 'doctor-cares.cookie-consent.v1';

// Routes where the banner must stay out of the way so the first-impression
// animation / content can breathe: splash, onboarding, landing.
const HIDDEN_ROUTES = ['/welcome', '/onboarding', '/about', '/launch-video.html'];

/**
 * Lightweight consent banner. Doctor Cares only uses functional cookies +
 * localStorage for session + language — no third-party trackers — so this
 * is informational, not a GDPR consent gate. "Got it" simply dismisses it;
 * nothing is loaded or unloaded based on the choice.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const onHiddenRoute = HIDDEN_ROUTES.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
      setVisible(true);
    } catch { /* storage unavailable — don't show */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* no-op */ }
    setVisible(false);
  };

  if (!visible || onHiddenRoute) return null;
  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto mb-4 max-w-md px-4 safe-bottom"
    >
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">We use cookies for sign-in</div>
            <p className="mt-1 text-xs text-ink-muted">
              Doctor Cares only stores what's needed to keep you logged in and remember your
              language. No ad trackers. See our{' '}
              <Link to="/privacy" className="text-brand-600 dark:text-brand-300 underline">Privacy Policy</Link>.
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="Dismiss"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full h-10 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
