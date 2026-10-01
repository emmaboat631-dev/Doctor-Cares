import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Droplet, Heart, Scale, Thermometer, Trash2, TrendingUp, Wind } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  METRIC_SPEC, deleteMetric, formatMetric, listMetrics, logMetric,
  type HealthMetric, type MetricType,
} from '@/lib/api/healthMetrics';
import { fmtDate, fmtTime } from '@/lib/format';
import { cn } from '@/lib/cn';

const TYPES: { key: MetricType; icon: React.ReactNode; tone: string }[] = [
  { key: 'heart_rate',  icon: <Heart       className="h-4 w-4" />, tone: 'text-rose-500 bg-rose-50 dark:bg-rose-500/15' },
  { key: 'bp',          icon: <Wind        className="h-4 w-4" />, tone: 'text-brand-600 bg-brand-50 dark:bg-brand-500/15' },
  { key: 'temperature', icon: <Thermometer className="h-4 w-4" />, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15' },
  { key: 'weight',      icon: <Scale       className="h-4 w-4" />, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-500/15' },
  { key: 'glucose',     icon: <Droplet     className="h-4 w-4" />, tone: 'text-pink-600 bg-pink-50 dark:bg-pink-500/15' },
  { key: 'spo2',        icon: <Activity    className="h-4 w-4" />, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15' },
];

export function HealthMetricsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = (params.get('type') as MetricType) || 'heart_rate';

  const [type, setType] = useState<MetricType>(
    TYPES.some((t) => t.key === initialType) ? initialType : 'heart_rate',
  );
  const [value, setValue]   = useState('');
  const [value2, setValue2] = useState('');
  const [notes, setNotes]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState<string | undefined>();

  const list = useAsync(
    () => (user ? listMetrics(user.id, type, 30) : Promise.resolve([])),
    [user?.id, type],
  );

  const spec = METRIC_SPEC[type];
  const latest = list.data?.[0];

  const chartPoints = useMemo(() => {
    if (!list.data || list.data.length === 0) return [];
    // oldest first for charting
    return [...list.data].reverse();
  }, [list.data]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const v  = Number(value);
    const v2 = spec.dualValue ? Number(value2) : null;
    if (!Number.isFinite(v) || v <= 0) return setError('Enter a valid number.');
    if (spec.dualValue && (!Number.isFinite(v2!) || (v2 ?? 0) <= 0)) {
      return setError('Enter both systolic and diastolic.');
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await logMetric({ userId: user.id, type, value: v, value2: v2, notes: notes.trim() || null });
      setValue(''); setValue2(''); setNotes('');
      list.refetch();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not log reading.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this reading?')) return;
    try {
      await deleteMetric(id);
      list.refetch();
    } catch { /* no-op */ }
  };

  return (
    <>
      <Header title="Health metrics" showBack onBack={() => navigate(-1)} />
      <div className="mx-auto max-w-xl px-4 py-4 space-y-4 pb-24">
        {/* Type picker */}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 pb-1">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                aria-pressed={type === t.key}
                className={cn(
                  'inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 h-9 text-xs font-bold transition border',
                  type === t.key
                    ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink border-ink dark:border-ink-onDark'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink-soft dark:text-slate-300',
                )}
              >
                <span className={cn('grid h-5 w-5 place-items-center rounded-full', type === t.key ? 'bg-white/15' : t.tone)}>
                  {t.icon}
                </span>
                {METRIC_SPEC[t.key].label}
              </button>
            ))}
          </div>
        </div>

        {/* Current reading summary */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-muted">Latest</div>
              {latest ? (
                <>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">{formatMetric(latest)}</span>
                    <span className="text-xs text-ink-muted">{latest.unit}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {fmtDate(latest.taken_at)} · {fmtTime(latest.taken_at)}
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-ink-muted">No readings yet.</div>
              )}
            </div>
            {latest && (
              <StatusBadge status={spec.normal(latest.value, latest.value2)} />
            )}
          </div>
          {chartPoints.length > 1 && <MiniChart points={chartPoints} />}
        </Card>

        {/* Log a new reading */}
        <Card>
          <div className="text-sm font-bold mb-3">Log a reading</div>
          <form onSubmit={submit} noValidate className="space-y-3">
            {spec.dualValue ? (
              <div className="flex items-end gap-2">
                <ValueInput label="Systolic" value={value}  onChange={setValue}  suffix="mmHg" />
                <span className="pb-3 text-ink-muted">/</span>
                <ValueInput label="Diastolic" value={value2} onChange={setValue2} suffix="mmHg" />
              </div>
            ) : (
              <ValueInput label="Value" value={value} onChange={setValue} suffix={spec.unit} />
            )}
            <div>
              <label htmlFor="notes" className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Notes <span className="font-normal opacity-70">(optional)</span>
              </label>
              <input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={200}
                placeholder="How were you feeling?"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 h-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" fullWidth loading={submitting}>Save reading</Button>
          </form>
        </Card>

        {/* History */}
        <section>
          <div className="mb-2 text-sm font-bold">History</div>
          {list.loading ? (
            <div className="space-y-2">{[0,1,2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}</div>
          ) : list.error ? (
            <ErrorState onRetry={list.refetch} />
          ) : (list.data ?? []).length === 0 ? (
            <EmptyState title="No readings yet" description="Log your first one above." />
          ) : (
            <div className="space-y-2">
              {list.data!.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold">{formatMetric(m)}</span>
                      <span className="text-[11px] text-ink-muted">{m.unit}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted">{fmtDate(m.taken_at)} · {fmtTime(m.taken_at)}</div>
                    {m.notes && <div className="mt-0.5 text-xs text-ink-soft dark:text-slate-300 line-clamp-1">{m.notes}</div>}
                  </div>
                  <StatusBadge status={spec.normal(m.value, m.value2)} />
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    aria-label="Delete reading"
                    className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function ValueInput({ label, value, onChange, suffix }: {
  label: string; value: string; onChange: (v: string) => void; suffix: string;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-muted">{label}</label>
      <div className="flex items-stretch rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 h-10 text-sm bg-transparent outline-none"
          placeholder="0"
        />
        <span className="grid place-items-center px-3 text-[11px] font-semibold text-ink-muted bg-slate-50 dark:bg-slate-800">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'low' | 'normal' | 'high' }) {
  const palette = {
    low:    'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
    normal: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    high:   'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  }[status];
  const label = { low: 'Low', normal: 'Normal', high: 'High' }[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold', palette)}>
      <TrendingUp className="h-3 w-3" /> {label}
    </span>
  );
}

function MiniChart({ points }: { points: HealthMetric[] }) {
  const W = 300, H = 60, PAD = 4;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const step = (W - PAD * 2) / Math.max(1, points.length - 1);
  const d = points.map((p, i) => {
    const x = PAD + i * step;
    const y = PAD + (1 - (p.value - min) / range) * (H - PAD * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full h-14" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
