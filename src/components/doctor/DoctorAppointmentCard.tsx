import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentStatus } from '@/types';
import type { AppointmentWithPatient } from '@/lib/api/appointments';

const statusTone: Record<AppointmentStatus, { tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  pending:   { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'danger',  label: 'Cancelled' },
  completed: { tone: 'info',    label: 'Completed' },
  rejected:  { tone: 'danger',  label: 'Declined' },
};

interface Props {
  appointment: AppointmentWithPatient;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onComplete?: (id: string) => void;
  busy?: string | null;
  linkTo?: string | false;
}

export function DoctorAppointmentCard({ appointment, onAccept, onReject, onComplete, busy, linkTo }: Props) {
  const p = appointment.patient;
  const tone = statusTone[appointment.status];
  const isBusy = busy === appointment.id;
  const href = linkTo === false ? undefined : (linkTo ?? `/appointments/${appointment.id}`);

  const isCurrent = () => {
    if (appointment.status !== 'confirmed') return false;
    const start = new Date(appointment.scheduled_at).getTime();
    const end = start + appointment.duration_minutes * 60_000;
    const now = Date.now();
    return now >= start - 5 * 60_000 && now <= end;
  };

  return (
    <Card padding="md" className={isCurrent() ? 'border-l-4 border-l-brand-500' : ''}>
      <div className="flex items-start gap-3">
        <Avatar name={p?.full_name} src={p?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {p?.full_name ?? 'Patient'} · {fmtTime(appointment.scheduled_at)}
              </div>
              {appointment.reason && (
                <div className="mt-0.5 truncate text-xs text-ink-muted">{appointment.reason}</div>
              )}
            </div>
            <Badge tone={tone.tone}>{tone.label}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-soft dark:text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Calendar className="h-3 w-3" aria-hidden /> {fmtDate(appointment.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Clock className="h-3 w-3" aria-hidden /> {appointment.duration_minutes}m
            </span>
            {appointment.mode === 'video' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                <Video className="h-3 w-3" aria-hidden /> Video
              </span>
            )}
            {appointment.mode === 'clinic' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                <MapPin className="h-3 w-3" aria-hidden /> Clinic
              </span>
            )}
          </div>
        </div>
      </div>

      {(onAccept || onReject || onComplete) && appointment.status !== 'cancelled' && appointment.status !== 'rejected' && (
        <div className="mt-3 flex gap-2">
          {appointment.status === 'pending' && onAccept && (
            <Button size="sm" fullWidth loading={isBusy} onClick={() => onAccept(appointment.id)}>Accept</Button>
          )}
          {appointment.status === 'pending' && onReject && (
            <Button size="sm" variant="outline" fullWidth loading={isBusy}
              className="!text-danger !border-danger/40 hover:!bg-danger-soft"
              onClick={() => onReject(appointment.id)}>
              Decline
            </Button>
          )}
          {appointment.status === 'confirmed' && onComplete && (
            <Button size="sm" fullWidth loading={isBusy} onClick={() => onComplete(appointment.id)}>Mark complete</Button>
          )}
          {href && (
            <Link
              to={href}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-sm font-semibold text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Details
            </Link>
          )}
        </div>
      )}

      {href && !(onAccept || onReject || onComplete) && (
        <Link to={href} className="mt-3 block text-xs font-semibold text-brand-600 dark:text-brand-300">
          View details →
        </Link>
      )}
    </Card>
  );
}
