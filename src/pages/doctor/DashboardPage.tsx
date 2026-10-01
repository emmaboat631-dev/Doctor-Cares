import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calendar, CheckCircle2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DoctorAppointmentCard } from '@/components/doctor/DoctorAppointmentCard';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  getDoctorTodayStats,
  listDoctorAppointments,
  setAppointmentStatus,
} from '@/lib/api/appointments';
import { unreadNotificationCount } from '@/lib/api/notifications';
import { greetingFor } from '@/lib/format';

export function DoctorDashboardPage() {
  const { user, profile } = useAuth();
  const userId = user?.id;

  const stats = useAsync(async () => (userId ? getDoctorTodayStats(userId) : { today: 0, pending: 0, week: 0 }), [userId]);
  const appts = useAsync(async () => (userId ? listDoctorAppointments(userId) : []), [userId]);
  const unread = useAsync(async () => (userId ? unreadNotificationCount(userId) : 0), [userId]);

  const [busy, setBusy] = useState<string | null>(null);

  const todayList = useMemo(() => {
    if (!appts.data) return [];
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();   endOfToday.setHours(23, 59, 59, 999);
    return appts.data
      .filter((a) => {
        const t = new Date(a.scheduled_at).getTime();
        return t >= startOfToday.getTime() && t <= endOfToday.getTime()
          && a.status !== 'cancelled' && a.status !== 'rejected';
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .map((a) => ({ ...a, _isPast: new Date(a.scheduled_at).getTime() + a.duration_minutes * 60_000 < now }));
  }, [appts.data]);

  const act = useCallback(async (id: string, status: 'confirmed' | 'rejected' | 'completed') => {
    setBusy(id);
    try {
      await setAppointmentStatus(id, status);
      await Promise.all([appts.refetch(), stats.refetch()]);
    } finally {
      setBusy(null);
    }
  }, [appts, stats]);

  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'Doctor';

  return (
    <>
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-4 pb-2 safe-top">
        <Avatar name={profile?.full_name} src={profile?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0">
          <div className="text-xs text-ink-muted">{greetingFor()},</div>
          <div className="truncate font-semibold">Dr. {firstName}</div>
        </div>
        <Link
          to="/notifications"
          className="ml-auto relative grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {(unread.data ?? 0) > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {(unread.data ?? 0) > 9 ? '9+' : unread.data}
            </span>
          )}
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Today" value={stats.data?.today ?? 0} tone="brand" loading={stats.loading} />
          <StatTile label="Pending" value={stats.data?.pending ?? 0} tone="warning" loading={stats.loading} />
          <StatTile label="This week" value={stats.data?.week ?? 0} loading={stats.loading} />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Today's schedule</h2>
          <Link to="/appointments" className="text-xs font-semibold text-brand-600 dark:text-brand-300">See all</Link>
        </div>

        {appts.loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : appts.error ? (
          <ErrorState onRetry={appts.refetch} />
        ) : todayList.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-5 w-5" />}
            title="Nothing on the calendar today"
            description="Enjoy the quiet, or check pending requests below."
          />
        ) : (
          <div className="space-y-2">
            {todayList.map((a) => (
              <DoctorAppointmentCard
                key={a.id}
                appointment={a}
                busy={busy}
                onAccept={a.status === 'pending' ? (id) => act(id, 'confirmed') : undefined}
                onReject={a.status === 'pending' ? (id) => act(id, 'rejected') : undefined}
                onComplete={a.status === 'confirmed' && !a._isPast ? undefined : a.status === 'confirmed' ? (id) => act(id, 'completed') : undefined}
              />
            ))}
          </div>
        )}

        {(stats.data?.pending ?? 0) > 0 && (
          <Card className="bg-warning-soft border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-warning text-white">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {stats.data?.pending} pending request{stats.data?.pending === 1 ? '' : 's'}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">Review and accept from the Appointments tab.</div>
              </div>
              <Link to="/appointments" className="inline-flex h-9 items-center rounded-xl bg-ink px-3 text-xs font-semibold text-white">
                Review
              </Link>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function StatTile({ label, value, tone, loading }: { label: string; value: number; tone?: 'brand' | 'warning'; loading?: boolean }) {
  return (
    <Card padding="sm" className="text-center">
      <div className={
        tone === 'brand'   ? 'text-xl font-bold text-brand-600 dark:text-brand-300'
        : tone === 'warning' ? 'text-xl font-bold text-amber-600 dark:text-amber-300'
        : 'text-xl font-bold'
      }>
        {loading ? '—' : value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
    </Card>
  );
}
