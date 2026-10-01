import { useEffect, useState } from 'react';
import { Share, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrandMark } from '@/components/ui/BrandMark';
import { usePwaInstall } from '@/hooks/usePwaInstall';

const DISMISS_KEY = 'dc:install-dismissed-at';
const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7; // one week
const FIRST_SHOW_DELAY_MS = 4000;             // wait 4s before nagging

/**
 * "Install this app" surface with two branches:
 *  - Android / desktop Chrome / Edge: fires the native prompt via beforeinstallprompt
 *  - iOS Safari: shows a manual "Tap Share ↑ then Add to Home Screen" hint
 * Dismissed for a week after the user closes it.
 */
export function InstallPrompt() {
  const { canInstall, iosHintNeeded, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall && !iosHintNeeded) return;
    let last = 0;
    try { last = Number(localStorage.getItem(DISMISS_KEY) ?? 0); } catch { /* ignore */ }
    if (Date.now() - last < COOLDOWN_MS) return;
    const t = setTimeout(() => setVisible(true), FIRST_SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInstall, iosHintNeeded]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setVisible(false);
  };

  const install = async () => {
    await promptInstall();
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Doctor Cares"
      className="fixed inset-x-3 bottom-24 sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 z-40
                 rounded-2xl card-surface shadow-pop p-4 animate-slide-up"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <BrandMark size="xs" className="shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Install Doctor Cares</p>

          {canInstall ? (
            <>
              <p className="text-xs text-ink-muted mt-0.5">Faster access, offline support, home-screen icon.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={install}>Install</Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
              </div>
            </>
          ) : iosHintNeeded ? (
            <>
              <p className="text-xs text-ink-muted mt-0.5">
                Tap the <b>Share</b> button <Share className="inline h-3 w-3 -mt-0.5" /> in Safari, then choose <b>Add to Home Screen</b>.
              </p>
              <div className="mt-3">
                <Button size="sm" variant="ghost" onClick={dismiss}>Got it</Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
