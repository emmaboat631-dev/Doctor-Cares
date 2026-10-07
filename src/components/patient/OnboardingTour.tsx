import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Calendar, HeartPulse, MessageSquare, X, type LucideIcon } from 'lucide-react';

type Step = {
  icon: LucideIcon;
  tint: string;
  title: string;
  body: string;
  ctaRoute?: string;
  ctaLabel?: string;
};

const KEY = 'doctor-cares.onboarding-tour.v1';

/**
 * 3-step tutorial shown on a new patient's first visit to the Home screen.
 * Rendered via a portal to document.body so parent stacking contexts (flex
 * layouts, transforms on the layout shell) can't push it below the pill nav.
 * Dismissed after completion or an explicit skip, persisted in localStorage.
 */
export function OnboardingTour() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    } catch { /* storage unavailable */ }
  }, []);

  // Lock body scroll while the tour is visible so the page under the dim
  // overlay can't be swiped.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* no-op */ }
    setVisible(false);
  };
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  if (!visible || typeof document === 'undefined') return null;
  const s = STEPS[step];

  // Portal to document.body — escapes every parent stacking context so the
  // modal is guaranteed to render on top of the pill nav and sticky bars.
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3"
      role="dialog"
      aria-modal="true"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        <button type="button" onClick={dismiss} aria-label="Skip"
          className="absolute top-2.5 right-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white hover:bg-black/35">
          <X className="h-4 w-4" />
        </button>

        {/* Compact hero — icon only, no tall colour block */}
        <div className={`shrink-0 h-20 ${s.tint} flex items-center justify-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/25 backdrop-blur ring-1 ring-white/30 text-white">
            <s.icon className="h-6 w-6" />
          </span>
        </div>

        <div className="p-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300">
              Step {step + 1} / {STEPS.length}
            </div>
            <div className="flex items-center gap-1" aria-hidden>
              {STEPS.map((_, i) => (
                <span key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-4 bg-brand-500' : 'w-1 bg-slate-300 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>

          <h2 className="mt-2 text-lg font-bold tracking-tight leading-tight">{s.title}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft dark:text-slate-300">{s.body}</p>

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={dismiss}
              className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
              Skip
            </button>
            <button type="button" onClick={next}
              className="flex-1 h-10 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600">
              {step === STEPS.length - 1 ? 'Get started' : 'Next'}
            </button>
          </div>

          {s.ctaRoute && (
            <button type="button"
              onClick={() => { dismiss(); navigate(s.ctaRoute!); }}
              className="mt-2 w-full text-center text-[11px] font-bold text-brand-600 dark:text-brand-300 hover:underline">
              {s.ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const STEPS: Step[] = [
  {
    icon: Calendar,
    tint: 'bg-gradient-to-br from-brand-500 to-brand-700',
    title: 'Book a doctor in two taps',
    body: 'Browse verified doctors and nurses, pick a time, get instant confirmation. Video or in-clinic.',
    ctaRoute: '/doctors',
    ctaLabel: 'Find a doctor now →',
  },
  {
    icon: MessageSquare,
    tint: 'bg-gradient-to-br from-accent-500 to-brand-600',
    title: 'Chat and call anytime',
    body: 'Secure messaging with your clinician after booking. Voice + video calls built in — no extra app.',
  },
  {
    icon: HeartPulse,
    tint: 'bg-gradient-to-br from-rose-500 to-rose-700',
    title: 'Vitals + Emergency SOS',
    body: 'Log heart rate, BP, and more. One-tap SOS to your next-of-kin or the ambulance.',
    ctaRoute: '/metrics',
    ctaLabel: 'Log your first vital →',
  },
];
