import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCw, X } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/**
 * Two toasts driven by the service worker lifecycle:
 *  - "Ready for offline" — one-time notice on very first install of the SW
 *  - "New version — Reload" — every subsequent deploy: user chooses when to
 *    reload so a form-in-progress isn't blown away mid-fill.
 *
 * Registers the SW once at module scope so re-renders don't re-register.
 */

type UpdateFn = (reloadPage?: boolean) => Promise<void>;
let updateSWFn: UpdateFn | null = null;
const listeners: Set<(state: { need: boolean; offline: boolean }) => void> = new Set();
let state = { need: false, offline: false };

const emit = () => listeners.forEach((l) => l(state));

// Register once when the module is imported (only in the browser).
// SKIPPED on Capacitor native builds — a bundled APK/IPA doesn't need the SW
// (the app IS its assets), and a lingering SW would happily serve stale JS
// after an app update, making updates invisible. On native we actively
// unregister any old registration and purge caches from a previous PWA
// install of the same origin.
if (typeof window !== 'undefined' && !updateSWFn) {
  const isNativeShell =
    typeof (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform === 'function' &&
    (window as unknown as { Capacitor: { isNativePlatform: () => boolean } })
      .Capacitor.isNativePlatform();

  if (isNativeShell) {
    // Defensive cleanup — kills any SW + caches left over from a previous
    // PWA install so the WebView can't keep serving pre-Capacitor JS.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => { /* ignore */ });
    }
    if (typeof caches !== 'undefined') {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n)))
        .catch(() => { /* ignore */ });
    }
  } else {
    updateSWFn = registerSW({
      immediate: true,
      // Throttle SW update checks: previously the SW re-registered aggressively
      // on every tab open, which under rapid-deploy conditions made the app
      // feel like it was "refreshing all the time". We now poll for a new SW
      // at most every 5 minutes once registered.
      onRegistered(registration) {
        if (!registration) return;
        const FIVE_MIN = 5 * 60 * 1000;
        setInterval(() => { registration.update().catch(() => { /* fine */ }); }, FIVE_MIN);
      },
      onNeedRefresh() {
        state = { ...state, need: true };
        emit();
      },
      onOfflineReady() {
        state = { ...state, offline: true };
        emit();
        // Auto-dismiss the "offline ready" toast after 6s.
        setTimeout(() => { state = { ...state, offline: false }; emit(); }, 6000);
      },
    });
  }
}

export function UpdatePrompt() {
  const [local, setLocal] = useState(state);

  useEffect(() => {
    const l = (s: typeof state) => setLocal({ ...s });
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const reload = async () => {
    if (updateSWFn) await updateSWFn(true);
  };

  return (
    <>
      {local.need && (
        <Toast tone="brand" role="dialog">
          <RotateCw className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">New version available</div>
            <div className="text-xs opacity-90 mt-0.5">Reload to get the latest updates.</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={reload} leftIcon={<RotateCw className="h-3.5 w-3.5" />}>
              Reload
            </Button>
            <button
              type="button"
              onClick={() => { state = { ...state, need: false }; emit(); }}
              aria-label="Dismiss"
              className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Toast>
      )}

      {local.offline && (
        <Toast tone="success" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">Ready to work offline</div>
            <div className="text-xs opacity-90 mt-0.5">Cached content will keep loading without a connection.</div>
          </div>
          <button
            type="button"
            onClick={() => { state = { ...state, offline: false }; emit(); }}
            aria-label="Dismiss"
            className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </Toast>
      )}
    </>
  );
}

function Toast({ tone, children, role }: {
  tone: 'brand' | 'success';
  children: React.ReactNode;
  role?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        'fixed left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50',
        // Above the mobile bottom nav (which is 78px + safe-area)
        'bottom-24 sm:bottom-4',
        'rounded-2xl shadow-pop px-4 py-3',
        'flex items-start gap-3 text-white',
        'animate-slide-up backdrop-blur',
        tone === 'brand'   && 'bg-brand-600',
        tone === 'success' && 'bg-emerald-600',
      )}
    >
      {children}
    </div>
  );
}
