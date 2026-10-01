import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Simple async-data hook. Runs the fetcher on mount and whenever deps change,
 * exposes { data, loading, error, refetch }. Cancels on unmount via AbortSignal.
 *
 * Purposefully lightweight — swap for @tanstack/react-query later if caching
 * and invalidation become non-trivial.
 */
export function useAsync<T>(fetcher: Fetcher<T>, deps: unknown[] = []): State<T> & { refetch: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const seq = useRef(0);

  const run = useCallback(() => {
    const my = ++seq.current;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher(controller.signal).then(
      (data) => {
        if (my !== seq.current) return;
        setState({ data, loading: false, error: null });
      },
      (err) => {
        if (my !== seq.current) return;
        if (err?.name === 'AbortError') return;
        setState({ data: null, loading: false, error: err?.message ?? 'Something went wrong.' });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = run();
    return cancel;
  }, [run]);

  return { ...state, refetch: run };
}
