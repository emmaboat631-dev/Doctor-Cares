import { useCallback, useEffect, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Simple async-data hook with a cross-mount cache. Reads from an in-memory
 * cache first — if the entry is fresh (younger than STALE_MS, default 60s),
 * the hook returns it immediately AND does NOT re-fetch. If the entry is
 * stale or missing, it fetches and populates the cache for next time.
 *
 * Why: navigating between tabs used to trigger a visible "loading…" flash
 * on every mount because each useAsync instance re-fetched its own data
 * from scratch. Now a tab you visited 20 seconds ago renders instantly
 * from cache; only an explicit `refetch()` (or a 60-second-old entry)
 * actually hits the network.
 *
 * Opt-in refresh: pass `{ refreshOnMount: true }` to force a background
 * refetch on every mount (still shows cached data instantly).
 */
export interface UseAsyncOptions {
  /** Cache key — defaults to JSON.stringify(deps). Override for finer control. */
  cacheKey?: string;
  /** Entry freshness window in ms. Default 60000 (60s). */
  staleMs?: number;
  /** If true, always refetch on mount but still show cached data meanwhile. */
  refreshOnMount?: boolean;
}

interface CacheEntry {
  data: unknown;
  storedAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_STALE_MS = 60_000;

/** Clear every cached entry. Call on sign-out so a new user doesn't see old data. */
export function clearAsyncCache(): void {
  cache.clear();
}

export function useAsync<T>(
  fetcher: Fetcher<T>,
  deps: unknown[] = [],
  options: UseAsyncOptions = {},
): State<T> & { refetch: () => void } {
  const key = options.cacheKey ?? JSON.stringify(deps);
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;

  const seq = useRef(0);
  const [state, setState] = useState<State<T>>(() => {
    const entry = cache.get(key);
    if (entry) return { data: entry.data as T, loading: false, error: null };
    return { data: null, loading: true, error: null };
  });

  const run = useCallback((force = false) => {
    const my = ++seq.current;
    const controller = new AbortController();
    const entry = cache.get(key);
    const isFresh = entry && Date.now() - entry.storedAt < staleMs;

    // Fresh cached data + not a forced refetch → serve from cache, skip network.
    if (!force && isFresh) {
      setState({ data: entry.data as T, loading: false, error: null });
      return () => controller.abort();
    }

    // We're going to the network. Only show loading if we have no prior data.
    setState((s) => ({ ...s, loading: s.data == null, error: null }));
    fetcher(controller.signal).then(
      (data) => {
        if (my !== seq.current) return;
        cache.set(key, { data, storedAt: Date.now() });
        setState({ data, loading: false, error: null });
      },
      (err) => {
        if (my !== seq.current) return;
        if (err?.name === 'AbortError') return;
        setState((s) => ({ data: s.data, loading: false, error: err?.message ?? 'Something went wrong.' }));
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs, ...deps]);

  useEffect(() => {
    const cancel = run(options.refreshOnMount ?? false);
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { ...state, refetch: () => run(true) };
}
