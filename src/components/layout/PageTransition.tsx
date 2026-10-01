import { useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

/**
 * Remounts Outlet content each pathname so a CSS enter-animation replays.
 * We also pick "back" vs "forward" using a lightweight nav history so the
 * page slides in from the correct side, iOS-style.
 */
export function PageTransition() {
  const location = useLocation();
  const historyRef = useRef<string[]>([]);

  const direction: 'forward' | 'back' = useMemo(() => {
    const stack = historyRef.current;
    const prevIdx = stack.lastIndexOf(location.pathname);
    if (prevIdx >= 0 && prevIdx < stack.length - 1) {
      // We saw this path before — treat as "back".
      historyRef.current = stack.slice(0, prevIdx + 1);
      return 'back';
    }
    historyRef.current = [...stack, location.pathname].slice(-40);
    return 'forward';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div
      key={location.pathname}
      className={direction === 'forward' ? 'page-enter-forward' : 'page-enter-back'}
      style={{ minHeight: '100%' }}
    >
      <Outlet />
    </div>
  );
}
