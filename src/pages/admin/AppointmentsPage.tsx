import { useMemo, useState } from 'react';
import { CalendarRange, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { listAdminAppointments } from '@/lib/api/admin';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import type { AppointmentStatus } from '@/types';
import { cn } from '@/lib/cn';

type Filter = 'all' | AppointmentStatus;

const STATUSES: Filter[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

const statusTone: Record<AppointmentStatus, 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'warning', confirmed: 'success', cancelled: 'danger', completed: 'info', rejected: 'danger',
};

export function AdminAppointmentsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const appts = useAsync(() => listAdminAppointments(), []);

  const filtered = useMemo(() => {
    let list = appts.data ?? [];
    if (filter !== 'all') list = list.filter((a) => a.status === filter);
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((a) => (
      (a.patient?.full_name ?? '').toLowerCase().includes(s)
      || (a.doctor?.full_name ?? '').toLowerCase().includes(s)
    ));
  }, [appts.data, filter, search]);

  return (
    <>
      <Header title="Appointments" />
      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition',
                filter === s
                  ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                  : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto min-w-[220px]">
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />} placeholder="Search by patient or doctor…" type="search" />
          </div>
        </div>

        {appts.loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : appts.error ? (
          <ErrorState onRetry={appts.refetch} description={appts.error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CalendarRange className="h-5 w-5" />} title="No appointments match" />
        ) : (
          <Card padding="none">
            {/* Header row (md+) */}
            <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_.6fr] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-ink-muted border-b border-slate-200/70 dark:border-slate-800">
              <span>Patient</span>
              <span>Doctor</span>
              <span>Scheduled</span>
              <span>Status</span>
              <span>Mode</span>
              <span className="text-right">Fee</span>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filtered.map((a) => (
                <div key={a.id} className="p-4 md:grid md:grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr_.6fr] md:gap-3 md:items-center flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={a.patient?.full_name} src={a.patient?.avatar_url ?? undefined} size="sm" />
                    <span className="text-sm font-semibold truncate">{a.patient?.full_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={a.doctor?.full_name} src={a.doctor?.avatar_url ?? undefined} size="sm" />
                    <span className="text-sm font-semibold truncate">{a.doctor?.full_name ?? '—'}</span>
                  </div>
                  <div className="text-xs text-ink-soft dark:text-slate-300">
                    <div>{fmtDate(a.scheduled_at)}</div>
                    <div className="text-ink-muted">{fmtTime(a.scheduled_at)}</div>
                  </div>
                  <div><Badge tone={statusTone[a.status]}>{a.status}</Badge></div>
                  <div className="text-xs text-ink-soft dark:text-slate-300 capitalize">{a.mode}</div>
                  <div className="text-xs font-semibold text-right text-brand-700 dark:text-brand-300">
                    {fmtMoney(a.fee)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
