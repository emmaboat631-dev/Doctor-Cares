import { Link } from 'react-router-dom';
import {
  CalendarCheck, CheckCircle2, FileText, HeartPulse,
  Lock, MessageSquare, Pill, Shield, Siren, Sparkles,
  Stethoscope, Video,
} from 'lucide-react';
import { BrandMark } from '@/components/ui/BrandMark';

/**
 * Public marketing landing page shown at / for logged-out visitors.
 * Signed-in users bypass this via the RoleRouter in AppRoutes.
 *
 * Design goals:
 *   • No bottom-nav chrome (this isn't the authenticated app)
 *   • Trust first — real patient outcomes, local market signals (Ghana / NHIS)
 *   • Three clear CTAs: Create account (primary), Log in, PWA install hint
 *   • Legal footer always visible
 */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950 text-ink dark:text-ink-onDark">
      <TopNav />
      <Hero />
      <TrustStrip />
      <Features />
      <HowItWorks />
      <ForClinicians />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ----- Sections --------------------------------------------------------------

function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur safe-top">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark size="xs" />
          <span className="font-bold tracking-tight">Doctor Cares</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link to="/login" className="hidden sm:inline-flex h-10 items-center px-3 text-sm font-semibold text-ink-soft dark:text-slate-300 hover:text-ink dark:hover:text-white">
            Log in
          </Link>
          <Link to="/register" className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-4 text-sm font-bold text-white hover:bg-brand-600 shadow-sm">
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-white to-accent-50 dark:from-brand-500/10 dark:via-slate-950 dark:to-accent-500/10" />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-20 grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
            <Sparkles className="h-3 w-3" /> Built for Ghana · Launched 2026
          </div>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
            Healthcare in your pocket.<br />
            <span className="text-brand-600 dark:text-brand-400">Anytime. Anywhere.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink-soft dark:text-slate-300 max-w-xl">
            Book verified doctors and nurses, chat securely, start a video consultation in one tap,
            track your vitals, and file NHIS claims — all in one app.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-500 px-6 text-sm font-bold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30">
              Create a free account
            </Link>
            <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-300 dark:border-slate-700 px-6 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
              Log in
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-4 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Free to join</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No credit card</span>
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Works offline</span>
          </div>
        </div>

        <div aria-hidden className="relative justify-self-center lg:justify-self-end">
          <div className="relative mx-auto w-72 sm:w-80 rounded-[2.5rem] bg-gradient-to-br from-brand-500 to-brand-700 p-5 shadow-[0_30px_60px_-15px_rgba(30,94,255,0.5)]">
            <div className="rounded-[1.75rem] bg-white dark:bg-slate-900 p-5">
              <img src="/brand-illustration.png" alt="Doctor Cares app illustration" className="w-full h-auto" loading="eager" />
              <div className="mt-4 space-y-2">
                <HeroMiniRow icon={<Video className="h-4 w-4" />} tone="brand" title="Video consultation at 2:00 PM" sub="Dr. Chris Stephens" />
                <HeroMiniRow icon={<HeartPulse className="h-4 w-4" />} tone="rose" title="Heart rate: 72 bpm" sub="Normal" />
                <HeroMiniRow icon={<FileText className="h-4 w-4" />} tone="emerald" title="NHIS claim approved" sub="GH₵80.00" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMiniRow({ icon, tone, title, sub }: { icon: React.ReactNode; tone: 'brand' | 'rose' | 'emerald'; title: string; sub: string }) {
  const palette = {
    brand:   'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    rose:    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  }[tone];
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 p-2.5">
      <span className={`grid h-8 w-8 place-items-center rounded-lg ${palette}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold truncate">{title}</div>
        <div className="text-[10px] text-ink-muted truncate">{sub}</div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const stats = [
    { num: '100%', label: 'Verified clinicians' },
    { num: '24/7', label: 'Chat support' },
    { num: 'EN · TW · FR', label: 'Multi-language' },
    { num: 'NHIS', label: 'Claims built-in' },
  ];
  return (
    <section className="border-y border-slate-200/70 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-5 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">{s.num}</div>
            <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { icon: Stethoscope,   title: 'Find verified doctors + nurses', body: 'Browse by specialty, read ratings, see consultation fees in Ghana Cedis. Only clinicians cleared by our admin team appear in search.' },
    { icon: Video,         title: 'Video or in-clinic visits',       body: 'Confirmed appointments get a one-tap video call powered by Jitsi Meet, with waiting-room presence so nobody joins to silence.' },
    { icon: MessageSquare, title: 'Secure chat',                     body: 'End-to-end encrypted messaging with your clinician after you book. Share images and documents up to 10 MB.' },
    { icon: Pill,          title: 'E-prescriptions',                 body: 'Doctors issue prescriptions in-app. Download the PDF and show it at any pharmacy — no faxing, no phone tag.' },
    { icon: HeartPulse,    title: 'Vital tracking',                  body: 'Log heart rate, blood pressure, temperature, glucose, SpO₂. Trend lines on your profile, visible to your care team.' },
    { icon: FileText,      title: 'NHIS claims',                     body: 'File claims the moment a visit ends. Admin reviews, you see status updates — approved, paid, or declined.' },
    { icon: Siren,         title: 'Emergency SOS',                   body: 'One tap to your next-of-kin or the Ghana ambulance line. Pre-fill your emergency contact once in your profile.' },
    { icon: Lock,          title: 'Private by design',               body: 'Hashed passwords, row-level security, hCaptcha, encrypted traffic. Your health data never leaves our locked-down database.' },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
      <div className="max-w-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300">What's inside</div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">A complete care platform, not just a chat app.</h2>
        <p className="mt-3 text-base text-ink-soft dark:text-slate-300">Everything you need to see a clinician, follow a treatment plan, and keep your records in one place.</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f) => (
          <div key={f.title} className="rounded-2xl border border-slate-200/70 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shadow-card hover:shadow-pop transition">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold tracking-tight">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft dark:text-slate-300">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: 1, title: 'Create your account',    body: 'Sign up in under a minute. Pick patient, doctor, or nurse.' },
    { n: 2, title: 'Find your clinician',    body: 'Browse verified doctors and nurses by specialty, rating, or availability.' },
    { n: 3, title: 'Book and consult',       body: 'Pick a time, choose video or clinic, and get instant confirmation.' },
    { n: 4, title: 'Chat, prescribe, pay',   body: 'Messages, prescriptions, and NHIS claims live in the same conversation.' },
  ];
  return (
    <section className="bg-slate-50 dark:bg-slate-900 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300">How it works</div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">From the Play Store to a diagnosis in four steps.</h2>
        </div>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 p-5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 text-white font-bold">{s.n}</div>
              <h3 className="mt-3 text-sm font-bold">{s.title}</h3>
              <p className="mt-1 text-xs text-ink-soft dark:text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ForClinicians() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-300">For doctors & nurses</div>
        <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Grow your practice without the paperwork.</h2>
        <p className="mt-4 text-base text-ink-soft dark:text-slate-300">
          Patients find you by specialty, book directly, and show up on time. You get a clean
          dashboard, structured clinical notes, prescriptions, and NHIS claims in one flow.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {[
            'Set your own fee and availability',
            'Accept bookings in one tap',
            'Write prescriptions and refer in-app',
            'File NHIS claims the moment a visit ends',
            'Build a review-driven reputation',
          ].map((b) => (
            <li key={b} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Link to="/register" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-bold text-white hover:bg-brand-600">
          Join as a clinician
        </Link>
      </div>
      <div aria-hidden className="rounded-3xl bg-gradient-to-br from-emerald-500 to-brand-600 p-8 text-white relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-28 w-28 rounded-full bg-white/10" />
        <blockquote className="relative text-xl font-semibold leading-relaxed">
          "Doctor Cares cut my no-show rate by half. Appointment reminders go out
          automatically, and NHIS claims no longer sit in a drawer."
        </blockquote>
        <div className="mt-6 flex items-center gap-3 relative">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 font-bold">CS</span>
          <div>
            <div className="text-sm font-bold">Dr. Chris Stephens</div>
            <div className="text-xs opacity-90">Optometrist · Accra</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white">
      <div className="mx-auto max-w-4xl px-5 py-14 sm:py-20 text-center">
        <Shield className="mx-auto h-10 w-10 opacity-90" />
        <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">Take care of your health today.</h2>
        <p className="mt-3 text-base opacity-90 max-w-xl mx-auto">
          Join thousands of patients already using Doctor Cares to book, chat with, and consult trusted clinicians.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white text-brand-700 px-6 text-sm font-bold hover:bg-brand-50 shadow-sm">
            <CalendarCheck className="h-4 w-4" /> Create a free account
          </Link>
          <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-white/40 text-white px-6 text-sm font-bold hover:bg-white/10">
            I already have one
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BrandMark size="xs" />
            <span className="font-bold">Doctor Cares</span>
          </div>
          <p className="text-xs text-ink-muted">Healthcare. Anytime. Anywhere.<br />Made for Ghana.</p>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-3">Product</div>
          <ul className="space-y-2">
            <li><Link to="/register" className="hover:text-brand-600 dark:hover:text-brand-300">Create account</Link></li>
            <li><Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-300">Log in</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-3">Legal</div>
          <ul className="space-y-2">
            <li><Link to="/terms"   className="hover:text-brand-600 dark:hover:text-brand-300">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-600 dark:hover:text-brand-300">Privacy Policy</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-3">Contact</div>
          <ul className="space-y-2 text-xs text-ink-muted">
            <li><a href="mailto:support@doctor-cares.app" className="hover:text-brand-600 dark:hover:text-brand-300">support@doctor-cares.app</a></li>
            <li><a href="mailto:privacy@doctor-cares.app" className="hover:text-brand-600 dark:hover:text-brand-300">privacy@doctor-cares.app</a></li>
            <li><a href="mailto:emmaboat631@gmail.com"   className="hover:text-brand-600 dark:hover:text-brand-300">emmaboat631@gmail.com</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200/70 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-5 py-4 text-[11px] text-ink-muted flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Doctor Cares. All rights reserved.</span>
          <span>Emergency? Call 112 (Ghana unified emergency).</span>
        </div>
      </div>
    </footer>
  );
}
