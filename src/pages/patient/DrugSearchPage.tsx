import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, Pill, Search, Trash2, X } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { useDebounced } from '@/hooks/useDebounced';
import { searchDrugs, type DrugSummary } from '@/lib/api/openfda';
import { clearDrugHistory, listRecentSearches } from '@/lib/api/drugHistory';

export function DrugSearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 350);

  const results = useAsync<DrugSummary[]>(
    (signal) => (debounced.trim().length >= 2 ? searchDrugs(debounced, { signal }) : Promise.resolve([])),
    [debounced],
  );

  const recent = useAsync(
    async () => (user ? listRecentSearches(user.id) : []),
    [user?.id],
  );

  const openDrug = (d: DrugSummary) => {
    navigate(`/drugs/${encodeURIComponent(d.id)}`, {
      state: { name: d.brand_name ?? d.generic_name ?? 'Drug' },
    });
  };

  const openByName = (name: string) => setQuery(name);

  const handleClearHistory = async () => {
    if (!user) return;
    if (!confirm('Clear your recent drug searches?')) return;
    await clearDrugHistory(user.id);
    await recent.refetch();
  };

  const showSearchState = debounced.trim().length >= 2;

  return (
    <>
      <Header title="Drug information" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Search medications (e.g. Paracetamol)"
          leftIcon={<Search className="h-4 w-4" />}
          rightSlot={query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Clear"
            >
              <X className="h-4 w-4" />
            </button>
          ) : undefined}
        />

        <div className="flex items-start gap-2 rounded-xl bg-info-soft/70 dark:bg-sky-500/10 border-l-4 border-info px-3 py-2 text-xs text-sky-800 dark:text-sky-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <b>Powered by OpenFDA.</b> Information only — not a substitute for medical advice.
            Always consult a licensed clinician or pharmacist before taking any medication.
          </div>
        </div>

        {/* Search results */}
        {showSearchState ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Results
                {results.data && !results.loading ? ` · ${results.data.length}` : ''}
              </h2>
              {results.loading && <span className="text-[11px] text-ink-muted">Searching…</span>}
            </div>
            {results.loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
              </div>
            ) : results.error ? (
              <ErrorState onRetry={results.refetch} description={results.error} />
            ) : (results.data ?? []).length === 0 ? (
              <EmptyState
                icon={<Pill className="h-5 w-5" />}
                title="No matches"
                description={`OpenFDA has no drug label for "${debounced}". Check spelling or try the generic name.`}
              />
            ) : (
              <div className="space-y-2">
                {results.data!.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => openDrug(d)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card px-3 py-3 hover:shadow-pop text-left transition"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-500/15 text-brand-500">
                      <Pill className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold capitalize">
                        {d.brand_name ?? d.generic_name ?? 'Unnamed drug'}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-muted">
                        {d.generic_name && d.brand_name && d.generic_name.toLowerCase() !== d.brand_name.toLowerCase()
                          ? d.generic_name
                          : d.manufacturer ?? d.product_type ?? 'Drug label'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          // Recent searches
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Recent searches</h2>
              {(recent.data ?? []).length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted hover:text-danger"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            {recent.loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
              </div>
            ) : (recent.data ?? []).length === 0 ? (
              <PopularStarters onPick={openByName} />
            ) : (
              <div className="space-y-2">
                {recent.data!.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openByName(r.drug_name ?? r.query)}
                    className="w-full flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 hover:shadow-pop text-left transition"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-ink-soft dark:text-slate-300">
                      <Search className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold capitalize">
                        {r.drug_name ?? r.query}
                      </div>
                      {r.drug_name && r.query.toLowerCase() !== r.drug_name.toLowerCase() && (
                        <div className="truncate text-xs text-ink-muted">Searched "{r.query}"</div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </button>
                ))}
              </div>
            )}

            {/* Also show popular starters even if there IS history — as a discovery aid. */}
            {(recent.data ?? []).length > 0 && <PopularStarters onPick={openByName} className="mt-5" />}
          </section>
        )}

      </div>
    </>
  );
}

const POPULAR = [
  { label: 'Paracetamol',  hint: 'Analgesic · Antipyretic' },
  { label: 'Ibuprofen',    hint: 'NSAID · Anti-inflammatory' },
  { label: 'Amoxicillin',  hint: 'Antibiotic' },
  { label: 'Metformin',    hint: 'Diabetes · Type 2' },
  { label: 'Loratadine',   hint: 'Antihistamine' },
  { label: 'Omeprazole',   hint: 'Acid reflux' },
];

function PopularStarters({ onPick, className }: { onPick: (name: string) => void; className?: string }) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Popular</h3>
      <div className="grid grid-cols-2 gap-2">
        {POPULAR.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(p.label)}
            className="flex items-center gap-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-left hover:shadow-card transition"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-500">
              <Pill className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold">{p.label}</div>
              <div className="truncate text-[10px] text-ink-muted">{p.hint}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
