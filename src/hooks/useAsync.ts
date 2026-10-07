import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

/**
 * Simple async-data hook. Each hook instance has its own state and will
 * re-fetch on mount unless the caller opts into cross-mount caching by
 * passing an explicit `cacheKey`.
 *
 * Why cacheKey is REQUIRED for sharing:
 *   Earlier versions derived a key automatically from `fetcher.toString()`.
 *   That worked in dev — but Vite's minifier renames every inline arrow to
 *   the same short name in production, so two unrelated callsites would
 *   collide (admin Overview and admin Health tips both became `"()=>n()::[]"`
 *   and read each other's data). Forcing cacheKey to be explicit removes
 *   the entire class of invisible collision bugs.
 *
 * Opt-in cross-mount cache: pass `{ cacheKey: 'admin-tips' }` to share data
 * between instances of the SAME hook across route navigations. Combine with
 * `deps` by baking the dep values into the key (e.g. `cacheKey: \`appt-${id}\``).
 *
 * Opt-in refresh: pass `{ refreshOnMount: true }` to force a background
 * refetch on every mount (still shows cached data meanwhile).
 */
export interface UseAsyncOptions {
  /** Explicit cross-mount cache key. Omit for no cross-mount sharing (safe default). */
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

// Monotonic counter to give each useAsync instance (that didn't supply a
// cacheKey) a private, collision-proof key. The key lives only in the Map
// for the lifetime of the mount so GC is bounded by setState churn, not
// permanent growth.
let instanceCounter = 0;

export function useAsync<T>(
  fetcher: Fetcher<T>,
  deps: unknown[] = [],
  options: UseAsyncOptions = {},
): State<T> & { refetch: () => void } {
  // Stable per-instance id when the caller didn't give us one. Guarantees no
  // two unrelated callsites can ever share a cache slot.
  const instanceId = useMemo(() => `__inst_${++instanceCounter}`, []);
  const key = options.cacheKey ?? instanceId;
  const staleMs = options.staleMs ?? DEFAULT_STALE_MS;
  const hasExplicitKey = options.cacheKey !== undefined;

  const seq = useRef(0);
  const [state, setState] = useState<State<T>>(() => {
    if (hasExplicitKey) {
      const entry = cache.get(key);
      if (entry) return { data: entry.data as T, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  const run = useCallback((force = false) => {
    const my = ++seq.current;
    const controller = new AbortController();
    const entry = hasExplicitKey ? cache.get(key) : undefined;
    const isFresh = entry && Date.now() - entry.storedAt < staleMs;

    // Fresh cached data + not a forced refetch → serve from cache, skip network.
    if (!force && isFresh && entry) {
      setState({ data: entry.data as T, loading: false, error: null });
      return () => controller.abort();
    }

    // We're going to the network. Only show loading if we have no prior data.
    setState((s) => ({ ...s, loading: s.data == null, error: null }));
    fetcher(controller.signal).then(
      (data) => {
        if (my !== seq.current) return;
        if (hasExplicitKey) cache.set(key, { data, storedAt: Date.now() });
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
  }, [key, staleMs, hasExplicitKey, ...deps]);

  useEffect(() => {
    const cancel = run(options.refreshOnMount ?? false);
    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { ...state, refetch: () => run(true) };
}
