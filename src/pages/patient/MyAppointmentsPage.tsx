import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Video } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listPatientAppointments, type AppointmentWithDoctor } from '@/lib/api/appointments';
import { fmtDate, fmtTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { AppointmentStatus } from '@/types';

type Tab = 'upcoming' | 'past' | 'cancelled';

const statusTone: Record<AppointmentStatus, { tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  pending:   { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'danger',  label: 'Cancelled' },
  completed: { tone: 'info',    label: 'Completed' },
  rejected:  { tone: 'danger',  label: 'Declined' },
};

export function MyAppointmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('upcoming');

  const appts = useAsync(
    () => (user ? listPatientAppointments(user.id) : Promise.resolve([])),
    [user?.id],
  );

  const upcomingCount = useMemo(() => {
    if (!appts.data) return 0;
    const now = Date.now();
    return appts.data.filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.scheduled_at).getTime() >= now).length;
  }, [appts.data]);

  const filtered = useMemo(() => {
    if (!appts.data) return [];
    const now = Date.now();
    switch (tab) {
      case 'upcoming':
        return appts.data
          .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.scheduled_at).getTime() >= now)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
      case 'past':
        return appts.data
          .filter((a) => a.status === 'completed' || (a.status !== 'cancelled' && a.status !== 'rejected' && new Date(a.scheduled_at).getTime() < now))
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
      case 'cancelled':
        return appts.data
          .filter((a) => a.status === 'cancelled' || a.status === 'rejected')
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    }
  }, [appts.data, tab]);

  return (
    <>
      <Header title="" />
      <div className="mx-auto max-w-3xl px-5 pt-2 pb-6 space-y-4">
        {/* Big title with counts */}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">My appointments</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {upcomingCount} upcoming · {appts.data?.length ?? 0} total
          </p>
        </div>

        {/* Segmented pill tabs */}
        <div className="flex gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {(['upcoming', 'past', 'cancelled'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                'flex-1 rounded-full py-2.5 text-xs font-bold capitalize transition-all duration-300',
                tab === t
                  ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink shadow-sm'
                  : 'text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
            >
              {t}
            </button>
          ))}
        </div>

        {appts.loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
          </div>
        ) : appts.error ? (
          <ErrorState onRetry={appts.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-5 w-5" />}
            title={
              tab === 'upcoming' ? 'No upcoming appointments'
              : tab === 'past' ? 'No past appointments'
              : 'No cancelled appointments'
            }
            description={
              tab === 'upcoming'
                ? 'Book with a doctor to get started.'
                : 'They\'ll appear here as your schedule fills up.'
            }
            action={tab === 'upcoming' ? (
              <Link to="/doctors" className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
                Find a doctor
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => <AppointmentRichCard key={a.id} appointment={a} tab={tab} />)}
          </div>
        )}
      </div>
    </>
  );
}

function AppointmentRichCard({ appointment: a, tab }: { appointment: AppointmentWithDoctor; tab: Tab }) {
  const navigate = useNavigate();
  const d = a.doctor;
  const specialty = d?.doctor_profile?.specialty;
  const tone = statusTone[a.status];
  const inFuture = new Date(a.scheduled_at).getTime() > Date.now();

  const primary = a.status === 'confirmed' && a.mode === 'video' && inFuture ? 'Join call'
                : a.status === 'pending' ? 'Details'
                : a.status === 'completed' ? 'Details'
                : 'Details';

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-card p-4 space-y-3">
      {/* Header row: avatar + name + status */}
      <div className="flex items-center gap-3">
        <Avatar name={d?.full_name} src={d?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{d?.full_name ?? 'Doctor'}</div>
          {specialty && <div className="mt-0.5 truncate text-xs text-ink-muted">{specialty}</div>}
        </div>
        <Badge tone={tone.tone}>{tone.label}</Badge>
      </div>

      {/* Info chips: date · time · mode */}
      <div className="flex flex-wrap gap-1.5">
        <InfoChip icon={<Calendar className="h-3 w-3" />} text={fmtDate(a.scheduled_at)} />
        <InfoChip icon={<Clock className="h-3 w-3" />} text={fmtTime(a.scheduled_at)} />
        {a.mode === 'video' && <InfoChip icon={<Video className="h-3 w-3" />} text="Video" />}
        {a.mode === 'clinic' && <InfoChip icon={<MapPin className="h-3 w-3" />} text="Clinic" />}
      </div>

      {/* Two-button row: outlined + filled primary */}
      {tab === 'upcoming' && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => navigate(`/doctors/${a.doctor_id}/book`)}
            className="flex-1 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={() => navigate(`/appointments/${a.id}`)}
            className="flex-1 h-10 rounded-full bg-brand-500 text-xs font-bold text-white shadow-md shadow-brand-500/30 hover:bg-brand-600 active:scale-[0.98] transition"
          >
            {primary}
          </button>
        </div>
      )}
      {tab !== 'upcoming' && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => navigate(`/appointments/${a.id}`)}
            className="flex-1 h-10 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition"
          >
            View details
          </button>
          {a.status === 'completed' && (
            <button
              type="button"
              onClick={() => navigate(`/appointments/${a.id}/review`)}
              className="flex-1 h-10 rounded-full bg-amber-500 text-xs font-bold text-white shadow-md shadow-amber-500/30 hover:bg-amber-600 active:scale-[0.98] transition inline-flex items-center justify-center gap-1"
            >
              ★ Rate visit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
      {icon} {text}
    </span>
  );
}
