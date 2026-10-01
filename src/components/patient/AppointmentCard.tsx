import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { fmtDate, fmtTime } from '@/lib/format';
import type { AppointmentWithDoctor } from '@/lib/api/appointments';
import type { AppointmentStatus } from '@/types';

const statusTone: Record<AppointmentStatus, { tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  pending:   { tone: 'warning', label: 'Pending' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'danger',  label: 'Cancelled' },
  completed: { tone: 'info',    label: 'Completed' },
  rejected:  { tone: 'danger',  label: 'Rejected' },
};

interface Props {
  appointment: AppointmentWithDoctor;
  /** Show a link wrapper — set false if the parent handles navigation. */
  linkTo?: string | false;
}

export function AppointmentCard({ appointment, linkTo }: Props) {
  const d = appointment.doctor;
  const specialty = d?.doctor_profile?.specialty;
  const tone = statusTone[appointment.status];
  const href = linkTo === false ? undefined : (linkTo ?? `/appointments/${appointment.id}`);

  const content = (
    <>
      <div className="flex items-start gap-3">
        <Avatar name={d?.full_name} src={d?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{d?.full_name ?? 'Doctor'}</div>
              {specialty && <div className="mt-0.5 truncate text-xs text-ink-muted">{specialty}</div>}
            </div>
            <Badge tone={tone.tone}>{tone.label}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-soft dark:text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Calendar className="h-3 w-3" aria-hidden /> {fmtDate(appointment.scheduled_at)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <Clock className="h-3 w-3" aria-hidden /> {fmtTime(appointment.scheduled_at)}
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
    </>
  );

  return href ? (
    <Link to={href} className="block">
      <Card interactive>{content}</Card>
    </Link>
  ) : (
    <Card>{content}</Card>
  );
}
