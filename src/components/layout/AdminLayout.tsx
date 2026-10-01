import { useState, useEffect } from 'react';
import { CalendarRange, Flag, LayoutDashboard, Lightbulb, Menu, Monitor, Settings, Stethoscope, Users, X } from 'lucide-react';
import { Sidebar, type SidebarItem } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { PageTransition } from './PageTransition';
import { cn } from '@/lib/cn';

const items: SidebarItem[] = [
  { to: '/', label: 'Overview',      icon: LayoutDashboard, end: true },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: CalendarRange },
  { to: '/reports', label: 'Reports', icon: Flag },
  { to: '/tips', label: 'Health tips', icon: Lightbulb },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Admin console — desktop-first, web-only.
 * No mobile bottom nav. On phones we render a friendly "please use desktop"
 * splash (with a "continue anyway" escape) since running heavy tables on a
 * 375px viewport is a bad experience.
 */
export function AdminLayout() {
  const [drawer, setDrawer] = useState(false);
  const [continuedOnMobile, setContinuedOnMobile] = useState(() => {
    try { return sessionStorage.getItem('dc:admin-mobile-ack') === '1'; } catch { return false; }
  });
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const ackMobile = () => {
    try { sessionStorage.setItem('dc:admin-mobile-ack', '1'); } catch { /* ignore */ }
    setContinuedOnMobile(true);
  };

  // Small-screen gate
  if (isPhone && !continuedOnMobile) {
    return <MobileGate onContinue={ackMobile} />;
  }

  return (
    <div className="min-h-dvh flex bg-surface-muted dark:bg-slate-950">
      {/* Persistent sidebar on md+, hidden below */}
      <div className="hidden md:flex">
        <Sidebar items={items} title="Doctor Cares · Admin" />
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <div className="relative z-10 flex">
            <Sidebar items={items} title="Doctor Cares · Admin" />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only — no bottom nav ever) */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800 safe-top">
          <button
            type="button"
            onClick={() => setDrawer((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={drawer ? 'Close menu' : 'Open menu'}
          >
            {drawer ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="text-sm font-bold">Doctor Cares · Admin</div>
        </div>

        <OfflineBanner />
        <main className="flex-1">
          <PageTransition />
        </main>
      </div>
    </div>
  );
}

function MobileGate({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-gradient-to-b from-brand-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-brand-500 text-white shadow-pop">
        <Monitor className="h-9 w-9" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Admin console</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        The Doctor Cares admin console is designed for desktop. Open{' '}
        <span className="font-semibold text-ink dark:text-ink-onDark">this URL on a laptop or desktop</span>{' '}
        for the best experience with tables, charts and moderation tools.
      </p>
      <button
        type="button"
        onClick={onContinue}
        className={cn(
          'mt-6 inline-flex h-11 items-center rounded-xl bg-slate-200 dark:bg-slate-800',
          'px-5 text-sm font-semibold text-ink-soft dark:text-slate-300 hover:bg-slate-300',
        )}
      >
        Continue on this device anyway
      </button>
      <p className="mt-4 text-[11px] text-ink-faint">
        Preference is saved for this session.
      </p>
    </div>
  );
}
