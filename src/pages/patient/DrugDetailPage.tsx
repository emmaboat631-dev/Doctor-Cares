import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, Baby, Beaker, Building2, Heart, Info, Pill, ShieldAlert, Skull, Timer } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getDrug, type DrugLabel } from '@/lib/api/openfda';
import { saveDrugSearch } from '@/lib/api/drugHistory';
import { cn } from '@/lib/cn';

const PillIcon = Pill;

type TabKey = 'purpose' | 'warnings' | 'dosage' | 'ingredients' | 'mfr';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'purpose',     label: 'Purpose',      icon: <Info className="h-3.5 w-3.5" /> },
  { key: 'warnings',    label: 'Warnings',     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { key: 'dosage',      label: 'Dosage',       icon: <Timer className="h-3.5 w-3.5" /> },
  { key: 'ingredients', label: 'Ingredients',  icon: <Beaker className="h-3.5 w-3.5" /> },
  { key: 'mfr',         label: 'Mfr',          icon: <Building2 className="h-3.5 w-3.5" /> },
];

/** Turn a list of paragraphs (with possible embedded newlines) into <p>s. */
function paragraphs(entries?: string[]): string[] {
  if (!entries || entries.length === 0) return [];
  const out: string[] = [];
  for (const raw of entries) {
    const parts = raw.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    out.push(...parts);
  }
  return out;
}

export function DrugDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('purpose');

  const drug = useAsync<DrugLabel | null>(
    (signal) => (id ? getDrug(id, signal) : Promise.resolve(null)),
    [id],
  );

  const displayName = useMemo(() => {
    const d = drug.data;
    const stateName = (location.state as { name?: string } | null)?.name;
    return d?.openfda?.brand_name?.[0]
        ?? d?.openfda?.generic_name?.[0]
        ?? stateName
        ?? 'Drug';
  }, [drug.data, location.state]);

  // Save to history once the drug loads (fire-and-forget).
  useEffect(() => {
    if (!user || !drug.data) return;
    const label = drug.data.openfda?.brand_name?.[0]
               ?? drug.data.openfda?.generic_name?.[0]
               ?? null;
    saveDrugSearch(user.id, displayName, label).catch(() => {});
  }, [user, drug.data, displayName]);

  if (drug.loading) return (<><Header title="Drug info" showBack /><LoadingSpinner fullScreen label="Loading drug label…" /></>);
  if (drug.error)   return (<><Header title="Drug info" showBack /><ErrorState onRetry={drug.refetch} description={drug.error} /></>);
  if (!drug.data)   return (<><Header title="Drug info" showBack /><EmptyState icon={<Pill className="h-5 w-5" />} title="Drug not found" description="The label may have been retired or moved." /></>);

  const d = drug.data;
  const generic = d.openfda?.generic_name?.[0] ?? null;
  const brands  = d.openfda?.brand_name ?? [];
  const routes  = d.openfda?.route ?? [];
  const form    = d.openfda?.dosage_form?.[0] ?? null;
  const mfr     = d.openfda?.manufacturer_name?.[0] ?? null;

  const purposeParas       = paragraphs(d.purpose ?? d.indications_and_usage);
  const warningsParas      = paragraphs(d.warnings);
  const doNotUse           = paragraphs(d.do_not_use);
  const askDoctor          = paragraphs(d.ask_doctor);
  const stopUse            = paragraphs(d.stop_use);
  const pregnancy          = paragraphs(d.pregnancy_or_breast_feeding);
  const keepAwayFromKids   = paragraphs(d.keep_out_of_reach_of_children);
  const dosageParas        = paragraphs(d.dosage_and_administration);
  const activeIng          = paragraphs(d.active_ingredient);
  const inactiveIng        = paragraphs(d.inactive_ingredient);

  return (
    <>
      <Header title={displayName} showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {/* Hero */}
        <Card padding="lg" className="bg-brand-50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/20">
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white shadow-sm">
              <PillIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Brand name</div>
              <h1 className="mt-0.5 text-lg font-bold capitalize break-words">{displayName}</h1>
              {generic && (
                <>
                  <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Generic name</div>
                  <div className="text-sm font-semibold capitalize">{generic.toLowerCase()}</div>
                </>
              )}
              {brands.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {brands.slice(0, 6).map((b) => (
                    <span key={b} className="inline-flex items-center rounded-full bg-white/70 dark:bg-slate-900/60 border border-brand-100 dark:border-brand-500/20 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300 capitalize">
                      {b.toLowerCase()}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form   && <Badge tone="neutral">{form}</Badge>}
                {routes.map((r) => <Badge key={r} tone="neutral" className="capitalize">{r.toLowerCase()}</Badge>)}
              </div>
            </div>
          </div>
        </Card>

        {/* Tab chips */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                tab === t.key
                  ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                  : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        {tab === 'purpose' && (
          <Section title="Purpose & indications" icon={<Info className="h-4 w-4" />} paragraphs={purposeParas}
            empty="No purpose statement in this drug's label." />
        )}

        {tab === 'warnings' && (
          <>
            <WarningSection title="Warnings" icon={<AlertTriangle className="h-4 w-4" />} paragraphs={warningsParas} />
            {doNotUse.length > 0        && <WarningSection title="Do not use" icon={<Skull className="h-4 w-4" />} paragraphs={doNotUse} tone="danger" />}
            {stopUse.length > 0         && <WarningSection title="Stop use and ask a doctor if…" icon={<ShieldAlert className="h-4 w-4" />} paragraphs={stopUse} />}
            {askDoctor.length > 0       && <WarningSection title="Ask a doctor before use" icon={<Heart className="h-4 w-4" />} paragraphs={askDoctor} />}
            {pregnancy.length > 0       && <WarningSection title="Pregnancy or breastfeeding" icon={<Heart className="h-4 w-4" />} paragraphs={pregnancy} />}
            {keepAwayFromKids.length > 0 && <WarningSection title="Keep out of reach of children" icon={<Baby className="h-4 w-4" />} paragraphs={keepAwayFromKids} />}
          </>
        )}

        {tab === 'dosage' && (
          <Section title="Dosage & administration" icon={<Timer className="h-4 w-4" />} paragraphs={dosageParas}
            empty="No dosage information in this drug's label." />
        )}

        {tab === 'ingredients' && (
          <>
            <Section title="Active ingredients" icon={<PillIcon className="h-4 w-4" />} paragraphs={activeIng}
              empty="No active-ingredient list." />
            {inactiveIng.length > 0 && (
              <Section title="Inactive ingredients" icon={<Beaker className="h-4 w-4" />} paragraphs={inactiveIng} />
            )}
          </>
        )}

        {tab === 'mfr' && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Manufacturer</div>
                <div className="mt-0.5 text-sm font-semibold">{mfr ?? '—'}</div>
                {d.openfda?.product_type?.[0] && (
                  <div className="mt-2 text-xs text-ink-muted capitalize">{d.openfda.product_type[0].toLowerCase()}</div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Persistent disclaimer */}
        <div className="rounded-xl bg-warning-soft border-l-4 border-warning px-3 py-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <b>⚠ Not medical advice.</b> Doctor Cares surfaces public OpenFDA labeling only. Always consult a licensed clinician or pharmacist before starting, stopping, or changing any medication.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  title, icon, paragraphs, empty,
}: {
  title: string;
  icon: React.ReactNode;
  paragraphs: string[];
  empty?: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-500">{icon}</span>
        <div className="text-sm font-bold">{title}</div>
      </div>
      {paragraphs.length === 0 ? (
        <p className="text-sm text-ink-muted italic">{empty}</p>
      ) : (
        <div className="space-y-2 text-sm leading-relaxed text-ink-soft dark:text-slate-300">
          {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
    </Card>
  );
}

function WarningSection({
  title, icon, paragraphs, tone = 'warning',
}: {
  title: string;
  icon: React.ReactNode;
  paragraphs: string[];
  tone?: 'warning' | 'danger';
}) {
  const styles = tone === 'danger'
    ? { wrap: 'bg-danger-soft border-danger/40 dark:bg-red-500/10', text: 'text-red-900 dark:text-red-300', chip: 'bg-danger text-white' }
    : { wrap: 'bg-warning-soft border-amber-300 dark:bg-amber-500/10', text: 'text-amber-900 dark:text-amber-300', chip: 'bg-warning text-white' };
  return (
    <Card className={cn(styles.wrap, 'border')}>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn('grid h-8 w-8 place-items-center rounded-lg', styles.chip)}>{icon}</span>
        <div className={cn('text-sm font-bold', styles.text)}>{title}</div>
      </div>
      <div className={cn('space-y-2 text-sm leading-relaxed', styles.text)}>
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </Card>
  );
}
