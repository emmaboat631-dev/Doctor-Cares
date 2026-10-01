import { useCallback, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listDoctorAppointments, setAppointmentStatus } from '@/lib/api/appointments';
import { cn } from '@/lib/cn';

type Tab = 'today' | 'upcoming' | 'pending' | 'past';

export function DoctorAppointmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [busy, setBusy] = useState<string | null>(null);

  const appts = useAsync(async () => (user ? listDoctorAppointments(user.id) : []), [user?.id]);

  const pendingCount = useMemo(
    () => (appts.data ?? []).filter((a) => a.status === 'pending').length,
    [appts.data],
  );

  const filtered = useMemo(() => {
    if (!appts.data) return [];
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();   endOfToday.setHours(23, 59, 59, 999);
    switch (tab) {
      case 'today':
        return appts.data
          .filter((a) => {
            const t = new Date(a.scheduled_at).getTime();
            return t >= startOfToday.getTime() && t <= endOfToday.getTime();
          })
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      case 'upcoming':
        return appts.data
          .filter((a) => new Date(a.scheduled_at).getTime() > endOfToday.getTime()
            && (a.status === 'pending' || a.status === 'confirmed'))
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      case 'pending':
        return appts.data
          .filter((a) => a.status === 'pending')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      case 'past':
        return appts.data
          .filter((a) => a.status === 'completed' || (new Date(a.scheduled_at).getTime() < now && a.status !== 'cancelled' && a.status !== 'rejected'))
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    }
  }, [appts.data, tab]);

  const act = useCallback(async (id: string, status: 'confirmed' | 'rejected' | 'completed') => {
    setBusy(id);
    try {
      await setAppointmentStatus(id, status);
      await appts.refetch();
    } finally {
      setBusy(null);
    }
  }, [appts]);

  return (
    <>
      <Header title="Appointments" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {(['today', 'upcoming', 'pending', 'past'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition inline-flex items-center gap-1.5',
                tab === t
                  ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                  : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {t}
              {t === 'pending' && pendingCount > 0 && (
                <span className={cn(
                  'inline-grid min-h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[9px] font-bold',
                  tab === t ? 'bg-white text-ink' : 'bg-danger text-white',
                )}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {appts.loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : appts.error ? (
          <ErrorState onRetry={appts.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-5 w-5" />}
            title={`No ${tab} appointments`}
            description={
              tab === 'today'    ? 'Your day is clear.'
              : tab === 'upcoming' ? 'No future bookings yet.'
              : tab === 'pending'  ? 'No requests waiting for approval.'
              : 'Past appointments will show here.'
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => (
              <DoctorAppointmentCard
                key={a.id}
                appointment={a}
                busy={busy}
                onAccept={a.status === 'pending' ? (id) => act(id, 'confirmed') : undefined}
                onReject={a.status === 'pending' ? (id) => act(id, 'rejected') : undefined}
                onComplete={a.status === 'confirmed' ? (id) => act(id, 'completed') : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
