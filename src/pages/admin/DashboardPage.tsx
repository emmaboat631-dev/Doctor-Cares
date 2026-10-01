import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck, Download, Flag, Plus, Search, Stethoscope,
  Users, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getPlatformStats, type PlatformStats } from '@/lib/api/admin';
import { cn } from '@/lib/cn';
import { fmtDate } from '@/lib/format';

type Range = '7D' | '30D' | '90D';

export function AdminDashboardPage() {
  const stats = useAsync(() => getPlatformStats(), []);
  const [range, setRange] = useState<Range>('30D');

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-8 space-y-6">
      {/* Page header — title + subtitle on the left; search + primary CTA on the right */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Overview</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            {' · Last '}{range === '7D' ? '7' : range === '30D' ? '30' : '90'} days
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="relative flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full md:w-72 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition">
            <Search className="absolute left-3.5 h-4 w-4 text-ink-muted" />
            <input
              type="search"
              placeholder="Search users, appointments, reports…"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-transparent text-xs outline-none placeholder:text-ink-muted"
            />
          </label>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link
            to="/doctors"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-500 px-4 text-xs font-bold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition"
          >
            <Plus className="h-3.5 w-3.5" /> Invite doctor
          </Link>
        </div>
      </header>

      {stats.loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : stats.error ? (
        <ErrorState onRetry={stats.refetch} description={stats.error} />
      ) : stats.data ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<Users className="h-4 w-4" />}         label="PATIENTS"     value={stats.data.patients}          delta="+12%"    tone="brand" />
            <KpiCard icon={<Stethoscope className="h-4 w-4" />}   label="DOCTORS"      value={stats.data.doctors}
              delta={stats.data.doctorsPending > 0 ? `${stats.data.doctorsPending} pending` : 'All verified'}
              tone="accent" href="/doctors" />
            <KpiCard icon={<CalendarCheck className="h-4 w-4" />} label="APPOINTMENTS" value={stats.data.appointmentsTotal}
              delta={`+${stats.data.appointmentsThisWeek} this week`} tone="warning" />
            <KpiCard icon={<Flag className="h-4 w-4" />}          label="OPEN REPORTS" value={stats.data.openReports}
              delta={stats.data.openReports > 0 ? `${stats.data.openReports} today` : 'None'}
              tone={stats.data.openReports > 0 ? 'danger' : 'neutral'} href="/reports" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <ChartCard perDay={stats.data.perDay} range={range} onRange={setRange} />
            </div>
            <StatusDonutCard breakdown={stats.data.statusBreakdown} />
          </div>

          {/* Recent activity */}
          <ActivityCard doctorsPending={stats.data.doctorsPending} openReports={stats.data.openReports} />
        </>
      ) : null}
    </div>
  );
}

// -- Cards ----------------------------------------------------------------

const toneStyles = {
  brand:   { ring: 'bg-brand-50 dark:bg-brand-500/15',    fg: 'text-brand-600 dark:text-brand-300' },
  accent:  { ring: 'bg-accent-50 dark:bg-accent-500/15',  fg: 'text-accent-600 dark:text-accent-500' },
  warning: { ring: 'bg-warning-soft dark:bg-amber-500/15', fg: 'text-amber-700 dark:text-amber-300' },
  danger:  { ring: 'bg-danger-soft dark:bg-red-500/15',   fg: 'text-red-700 dark:text-red-300' },
  neutral: { ring: 'bg-slate-100 dark:bg-slate-800',      fg: 'text-ink-soft dark:text-slate-300' },
} as const;

function KpiCard({
  icon, label, value, delta, tone = 'neutral', href,
}: {
  icon: React.ReactNode; label: string; value: number; delta: string;
  tone?: keyof typeof toneStyles; href?: string;
}) {
  const t = toneStyles[tone];
  const isDanger = tone === 'danger' && value > 0;
  const body = (
    <Card className="!p-5 hover:shadow-pop transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', t.ring, t.fg)}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{label}</span>
      </div>
      <div className={cn('mt-4 text-3xl font-bold tracking-tight', isDanger && 'text-danger')}>
        {value.toLocaleString()}
      </div>
      <div className={cn('mt-1 text-[11px] font-bold', tone === 'danger' && value > 0 ? 'text-danger' : t.fg)}>
        {delta} <span className="font-normal text-ink-muted ml-1">vs previous</span>
      </div>
    </Card>
  );
  return href ? <Link to={href} className="block">{body}</Link> : body;
}

function ChartCard({ perDay, range, onRange }: {
  perDay: PlatformStats['perDay']; range: Range; onRange: (r: Range) => void;
}) {
  const max = useMemo(() => Math.max(1, ...perDay.map((d) => d.count)), [perDay]);
  const total = perDay.reduce((s, d) => s + d.count, 0);
  return (
    <Card className="!p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-sm font-bold">Appointments over time</div>
          <div className="text-xs text-ink-muted mt-0.5">{total} total · Last {range === '7D' ? '7' : range === '30D' ? '30' : '90'} days</div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-surface-muted dark:bg-slate-800 p-1">
          {(['7D', '30D', '90D'] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-bold transition',
                range === r
                  ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink shadow-sm'
                  : 'text-ink-soft dark:text-slate-300 hover:text-ink',
              )}
            >{r}</button>
          ))}
        </div>
      </div>
      <div className="h-40 flex items-end gap-1.5">
        {perDay.map((d) => {
          const h = (d.count / max) * 100;
          return (
            <div
              key={d.date}
              title={`${fmtDate(d.date)} — ${d.count}`}
              className="flex-1 min-w-[3px] rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 hover:from-brand-700 hover:to-brand-500 transition-colors"
              style={{ height: `${Math.max(2, h)}%` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-ink-muted">
        <span>{fmtDate(perDay[0]?.date ?? new Date().toISOString(), { month: 'short', day: 'numeric' })}</span>
        <span>{fmtDate(perDay[perDay.length - 1]?.date ?? new Date().toISOString(), { month: 'short', day: 'numeric' })}</span>
      </div>
    </Card>
  );
}

function StatusDonutCard({ breakdown }: { breakdown: PlatformStats['statusBreakdown'] }) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
  const segs = [
    { key: 'confirmed', color: '#1E5EFF', dot: 'bg-brand-500',  label: 'Confirmed' },
    { key: 'completed', color: '#0FA774', dot: 'bg-accent-500', label: 'Completed' },
    { key: 'pending',   color: '#F59E0B', dot: 'bg-warning',    label: 'Pending' },
    { key: 'cancelled', color: '#DC2626', dot: 'bg-danger',     label: 'Cancelled' },
    { key: 'rejected',  color: '#94A3B8', dot: 'bg-slate-400',  label: 'Rejected' },
  ] as const;
  let angle = 0;
  const parts: string[] = [];
  if (total === 0) parts.push(`#E2E8F0 0deg 360deg`);
  else {
    for (const s of segs) {
      const val = breakdown[s.key as keyof PlatformStats['statusBreakdown']] ?? 0;
      const next = angle + (val / total) * 360;
      if (val > 0) parts.push(`${s.color} ${angle}deg ${next}deg`);
      angle = next;
    }
  }
  return (
    <Card className="!p-6">
      <div className="text-sm font-bold mb-5">By status</div>
      <div className="flex items-center gap-5">
        <div
          className="relative h-28 w-28 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${parts.join(', ')})` }}
          aria-label="Appointment status distribution"
        >
          <div className="absolute inset-3 rounded-full bg-white dark:bg-slate-900 grid place-items-center text-center">
            <div>
              <div className="text-base font-bold leading-none">{total}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-ink-muted mt-0.5">total</div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {segs.map((s) => {
            const val = breakdown[s.key as keyof PlatformStats['statusBreakdown']] ?? 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center gap-2 text-xs">
                <span className={cn('h-2.5 w-2.5 rounded-sm', s.dot)} />
                <span className="flex-1 text-ink-soft dark:text-slate-300">{s.label}</span>
                <span className="tabular-nums font-bold">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function ActivityCard({ doctorsPending, openReports }: { doctorsPending: number; openReports: number }) {
  const items = [
    doctorsPending > 0 && {
      icon: <Stethoscope className="h-4 w-4" />, tint: 'bg-accent-50 dark:bg-accent-500/15 text-accent-600 dark:text-accent-500',
      title: `${doctorsPending} doctor${doctorsPending === 1 ? '' : 's'} awaiting verification`,
      sub: 'Review credentials and approve to make them visible in the marketplace.',
      time: 'now', href: '/doctors',
    },
    openReports > 0 && {
      icon: <AlertTriangle className="h-4 w-4" />, tint: 'bg-danger-soft dark:bg-red-500/15 text-red-700 dark:text-red-300',
      title: `${openReports} open moderation report${openReports === 1 ? '' : 's'}`,
      sub: 'Unresolved items in the queue — review and act to keep the platform safe.',
      time: 'now', href: '/reports',
    },
    {
      icon: <TrendingUp className="h-4 w-4" />, tint: 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300',
      title: 'Platform growing steadily',
      sub: 'Appointment volume up week-over-week — bookings healthy across all specialties.',
      time: '1h ago', href: '/appointments',
    },
  ].filter(Boolean) as { icon: React.ReactNode; tint: string; title: string; sub: string; time: string; href: string }[];

  return (
    <Card className="!p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-bold">Recent activity</div>
        <button className="text-[11px] font-bold text-brand-600 dark:text-brand-300 hover:underline">See all →</button>
      </div>
      <div className="divide-y divide-slate-200/70 dark:divide-slate-800 -mx-2">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-success-soft text-success">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-bold">All caught up</div>
            <p className="mt-1 text-xs text-ink-muted">No pending verifications, no open reports. Nice.</p>
          </div>
        ) : items.map((it, i) => (
          <Link key={i} to={it.href} className="flex items-center gap-4 py-4 px-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
            <span className={cn('grid h-10 w-10 place-items-center rounded-xl shrink-0', it.tint)}>{it.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{it.title}</div>
              <div className="text-xs text-ink-muted mt-0.5 line-clamp-1">{it.sub}</div>
            </div>
            <span className="text-[10px] text-ink-muted whitespace-nowrap">{it.time}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
