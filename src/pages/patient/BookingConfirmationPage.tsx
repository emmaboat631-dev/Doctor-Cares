import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge, type AppointmentStatus } from '@/components/ui/StatusBadge';
import { useAsync } from '@/hooks/useAsync';
import { getAppointmentForPatient } from '@/lib/api/appointments';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { downloadIcs } from '@/lib/calendar';

export function BookingConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const appt = useAsync(() => (id ? getAppointmentForPatient(id) : Promise.resolve(null)), [id]);

  if (appt.loading) return (<><Header title="Appointment" /><LoadingSpinner fullScreen /></>);
  if (!appt.data) return (<><Header title="Appointment" /><EmptyState title="Appointment not found" /></>);

  const d = appt.data;

  return (
    <>
      <Header title="Appointment" />
      <div className="mx-auto max-w-3xl px-4 py-8 text-center space-y-5">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-success-soft">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-success text-white">
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-bold">Appointment requested</h1>
          <p className="mt-1 text-sm text-ink-muted">You'll get a notification once the doctor confirms.</p>
        </div>
        <Card className="text-left space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={d.doctor?.full_name} src={d.doctor?.avatar_url ?? undefined} size="md" />
              <div>
                <div className="text-sm font-semibold">{d.doctor?.full_name}</div>
                <div className="text-xs text-ink-muted">{d.doctor?.doctor_profile?.specialty ?? '—'}</div>
              </div>
            </div>
            <StatusBadge status={d.status as AppointmentStatus} />
          </div>
          <div className="hairline pt-3 space-y-2 text-sm">
            <Row label="Date & time" value={`${fmtDate(d.scheduled_at)} · ${fmtTime(d.scheduled_at)}`} />
            <Row label="Consultation" value={d.mode === 'video' ? 'Video call' : d.mode === 'clinic' ? 'Clinic visit' : 'Home visit'} />
            <Row label="Duration" value={`${d.duration_minutes} min`} />
            <Row label="Fee" value={<span className="font-bold text-brand-700 dark:text-brand-300">{fmtMoney(d.fee)}</span>} />
          </div>
        </Card>
        <div className="flex flex-col gap-2 max-w-xs mx-auto">
          <Link to="/appointments" className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">
            View my appointments
          </Link>
          <button
            type="button"
            onClick={() => {
              const start = new Date(d.scheduled_at);
              const end = new Date(start.getTime() + d.duration_minutes * 60_000);
              const mode = d.mode === 'video' ? 'Video consultation'
                : d.mode === 'clinic' ? 'Clinic visit' : 'Home visit';
              downloadIcs({
                uid: `${d.id}@doctor-cares`,
                title: `Appointment with ${d.doctor?.full_name ?? 'your doctor'}`,
                description: `${mode}. Status: ${d.status}. ${d.doctor?.doctor_profile?.specialty ?? ''}`.trim(),
                location: mode,
                start,
                end,
              });
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Add to calendar
          </button>
          <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800">
            Back to home
          </Link>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
