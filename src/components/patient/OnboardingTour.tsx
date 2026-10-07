import { useEffect, useState } from 'react';
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
 * Dismissed after completion or an explicit skip, persisted in localStorage.
 * Shows once per device.
 */
export function OnboardingTour() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
      // Delay a tick so it doesn't jank the home-screen load
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    } catch { /* storage unavailable — don't show */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(KEY, new Date().toISOString()); } catch { /* no-op */ }
    setVisible(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  if (!visible) return null;
  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 overflow-y-auto p-4 safe-top safe-bottom" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        <button type="button" onClick={dismiss} aria-label="Skip"
          className="absolute top-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-ink-muted hover:bg-slate-200 dark:hover:bg-slate-700">
          <X className="h-4 w-4" />
        </button>

        <div className={`shrink-0 h-24 sm:h-32 ${s.tint} flex items-center justify-center`}>
          <span className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-white/25 backdrop-blur ring-1 ring-white/30 text-white">
            <s.icon className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
        </div>

        <div className="p-5 pb-5 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300">
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight">{s.title}</h2>
          <p className="mt-1.5 text-sm text-ink-soft dark:text-slate-300">{s.body}</p>

          <div className="mt-4 flex items-center gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`} />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={dismiss}
              className="flex-1 h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
              Skip
            </button>
            <button type="button" onClick={next}
              className="flex-1 h-11 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600">
              {step === STEPS.length - 1 ? 'Get started' : 'Next'}
            </button>
          </div>

          {s.ctaRoute && (
            <button type="button"
              onClick={() => { dismiss(); navigate(s.ctaRoute!); }}
              className="mt-3 w-full text-center text-xs font-bold text-brand-600 dark:text-brand-300 hover:underline">
              {s.ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const STEPS: Step[] = [
  {
    icon: Calendar,
    tint: 'bg-gradient-to-br from-brand-500 to-brand-700',
    title: 'Book a doctor in two taps',
    body: 'Browse verified doctors and nurses, pick a time that works, and get instant confirmation. Video or in-clinic — your choice.',
    ctaRoute: '/doctors',
    ctaLabel: 'Find a doctor now →',
  },
  {
    icon: MessageSquare,
    tint: 'bg-gradient-to-br from-accent-500 to-brand-600',
    title: 'Chat and call anytime',
    body: "Message your clinician securely once you've shared an appointment. Voice and video calls are built in — no extra app needed.",
  },
  {
    icon: HeartPulse,
    tint: 'bg-gradient-to-br from-rose-500 to-rose-700',
    title: 'Track your vitals + Emergency SOS',
    body: 'Log heart rate, blood pressure, and more. Add an emergency contact so one tap can reach your next-of-kin or the ambulance.',
    ctaRoute: '/metrics',
    ctaLabel: 'Log your first vital →',
  },
];
