import { Outlet } from 'react-router-dom';
import { OfflineBanner } from './OfflineBanner';

export function AuthLayout() {
  return (
    // A tall auth form (Register especially) has to scroll on small phones,
    // and its inputs must not disappear behind the on-screen keyboard. Using
    // an explicit scroll container guarantees both regardless of what the
    // WebView does with min-h-dvh, and the pb-[max(...)] pads out so the last
    // input clears the keyboard's default height on Android.
    <div className="min-h-dvh flex flex-col bg-surface-muted dark:bg-slate-950 safe-top">
      <OfflineBanner />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-5 pt-6 sm:pt-12 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
