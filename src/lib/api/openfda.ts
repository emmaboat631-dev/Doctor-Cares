/**
 * OpenFDA drug label client — no API key required (rate limit is ~40 req/min
 * per IP). Responses are cached for 24h by our service worker (see vite.config).
 *
 * Endpoint: https://api.fda.gov/drug/label.json
 * Docs:     https://open.fda.gov/apis/drug/label/
 */

const BASE = 'https://api.fda.gov/drug/label.json';

/** Raw OpenFDA label record (subset of interesting fields). */
export interface DrugLabel {
  id: string;
  set_id?: string;
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  do_not_use?: string[];
  ask_doctor?: string[];
  when_using?: string[];
  stop_use?: string[];
  pregnancy_or_breast_feeding?: string[];
  keep_out_of_reach_of_children?: string[];
  dosage_and_administration?: string[];
  active_ingredient?: string[];
  inactive_ingredient?: string[];
  storage_and_handling?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    substance_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
    route?: string[];
    dosage_form?: string[];
  };
}

/** Compact shape shown in the search list. */
export interface DrugSummary {
  id: string;
  brand_name: string | null;
  generic_name: string | null;
  manufacturer: string | null;
  purpose: string | null;
  product_type: string | null;
}

class OpenFdaError extends Error {
  constructor(msg: string, public readonly status?: number) {
    super(msg);
    this.name = 'OpenFdaError';
  }
}

// Escape user input for the OpenFDA search DSL. Quotes are the important thing.
const esc = (s: string) => s.replace(/["\\]/g, '\\$&');

const fetchJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const res = await fetch(url, { signal });
  if (res.status === 404) throw new OpenFdaError('No matching drug found.', 404);
  if (res.status === 429) throw new OpenFdaError('You\'re searching too fast — wait a moment and try again.', 429);
  if (!res.ok) {
    let msg = `Drug service error (${res.status}).`;
    try { const body = await res.json(); msg = body.error?.message ?? msg; } catch { /* ignore */ }
    throw new OpenFdaError(msg, res.status);
  }
  return (await res.json()) as T;
};

const summarize = (label: DrugLabel): DrugSummary => ({
  id: label.id,
  brand_name:   label.openfda?.brand_name?.[0]   ?? null,
  generic_name: label.openfda?.generic_name?.[0] ?? null,
  manufacturer: label.openfda?.manufacturer_name?.[0] ?? null,
  purpose:      label.purpose?.[0] ?? label.indications_and_usage?.[0] ?? null,
  product_type: label.openfda?.product_type?.[0] ?? null,
});

/**
 * Common international-name → US-labeling synonyms. OpenFDA is a US-only DB,
 * so a search for "paracetamol" (rest-of-world) yields nothing — we retry as
 * "acetaminophen" behind the scenes.
 */
const SYNONYMS: Record<string, string> = {
  paracetamol:   'acetaminophen',
  adrenaline:    'epinephrine',
  salbutamol:    'albuterol',
  frusemide:     'furosemide',
  pethidine:     'meperidine',
  lignocaine:    'lidocaine',
  glyceryl_trinitrate: 'nitroglycerin',
};

const runSearch = async (query: string, limit: number, signal?: AbortSignal): Promise<DrugSummary[]> => {
  const url = `${BASE}?search=${encodeURIComponent(query)}&limit=${limit}`;
  try {
    const body = await fetchJson<{ results?: DrugLabel[] }>(url, signal);
    return (body.results ?? []).map(summarize);
  } catch (e) {
    if (e instanceof OpenFdaError && e.status === 404) return [];
    throw e;
  }
};

/**
 * Free-text search. Runs a tiered query so a wider net is cast:
 *   1. Exact phrase in brand/generic/substance (strongest signal, cleanest)
 *   2. Wildcard prefix in brand/generic/substance (catches partial typing)
 *   3. Free-text across indications_and_usage + purpose (catches "pain",
 *      "fever", "headache" and other symptom-based queries)
 * Results are merged and deduped so the user sees more hits than they used
 * to for most queries, especially for common/short search terms.
 */
export async function searchDrugs(query: string, opts: { signal?: AbortSignal; limit?: number } = {}): Promise<DrugSummary[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const limit = opts.limit ?? 50;
  const t = esc(q);

  // Apply any synonym mapping (paracetamol → acetaminophen) up front.
  const synonym = SYNONYMS[q.toLowerCase()];
  const term = synonym ?? t;

  const bucketSize = Math.max(10, Math.ceil(limit / 3));

  const tier1 = [
    `openfda.brand_name:"${term}"`,
    `openfda.generic_name:"${term}"`,
    `openfda.substance_name:"${term}"`,
  ].join('+');

  // Wildcard — OpenFDA accepts `field:term*` for prefix matching.
  const tier2 = [
    `openfda.brand_name:${term}*`,
    `openfda.generic_name:${term}*`,
    `openfda.substance_name:${term}*`,
  ].join('+');

  // Symptom text search — unquoted so OpenFDA tokenizes.
  const tier3 = [
    `indications_and_usage:${term}`,
    `purpose:${term}`,
  ].join('+');

  // Run all three in parallel. Any failure returns [] — we take whatever
  // the others gave us rather than nothing.
  const [a, b, c] = await Promise.all([
    runSearch(`(${tier1})`, bucketSize, opts.signal).catch(() => []),
    runSearch(`(${tier2})`, bucketSize, opts.signal).catch(() => []),
    runSearch(`(${tier3})`, bucketSize, opts.signal).catch(() => []),
  ]);

  // Dedupe by generic name (case-insensitive), prefer rows with a purpose.
  const seen = new Map<string, DrugSummary>();
  for (const r of [...a, ...b, ...c]) {
    const key = (r.generic_name ?? r.brand_name ?? r.id).toLowerCase();
    const existing = seen.get(key);
    if (!existing || (!existing.purpose && r.purpose)) seen.set(key, r);
  }
  return Array.from(seen.values()).slice(0, limit);
}

export async function getDrug(id: string, signal?: AbortSignal): Promise<DrugLabel | null> {
  const url = `${BASE}?search=id:"${esc(id)}"&limit=1`;
  const body = await fetchJson<{ results?: DrugLabel[] }>(url, signal);
  return body.results?.[0] ?? null;
}

/** Convenience — pick the first label for a given drug name (used from recent searches). */
export async function getDrugByName(name: string, signal?: AbortSignal): Promise<DrugLabel | null> {
  const hits = await searchDrugs(name, { signal, limit: 1 });
  if (hits[0]) return getDrug(hits[0].id, signal);
  return null;
}
