import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Video } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { cancelAppointment, getAppointmentForPatient } from '@/lib/api/appointments';
import { openConversationWith } from '@/lib/api/chat';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import type { AppointmentStatus } from '@/types';

const statusTone: Record<AppointmentStatus, { tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  pending:   { tone: 'warning', label: 'Pending confirmation' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'danger',  label: 'Cancelled' },
  completed: { tone: 'info',    label: 'Completed' },
  rejected:  { tone: 'danger',  label: 'Declined' },
};

export function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appt = useAsync(() => (id ? getAppointmentForPatient(id) : Promise.resolve(null)), [id]);
  const [cancelling, setCancelling] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleMessage = async () => {
    if (!appt.data?.doctor_id) return;
    setMessaging(true);
    try {
      const cid = await openConversationWith(appt.data.doctor_id);
      navigate(`/chat/${cid}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not open the conversation.');
    } finally {
      setMessaging(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    if (!confirm('Cancel this appointment? This cannot be undone.')) return;
    setError(undefined);
    setCancelling(true);
    try {
      await cancelAppointment(id);
      navigate('/appointments');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not cancel — please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (appt.loading) return (<><Header title="Appointment" showBack /><LoadingSpinner fullScreen /></>);
  if (!appt.data) return (<><Header title="Appointment" showBack /><EmptyState title="Appointment not found" /></>);

  const d = appt.data;
  const tone = statusTone[d.status];
  const canCancel = d.status === 'pending' || d.status === 'confirmed';
  const inFuture = new Date(d.scheduled_at).getTime() > Date.now();

  return (
    <>
      <Header title="Appointment" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card className="bg-brand-50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/20">
          <div className="flex items-center gap-3">
            <Avatar name={d.doctor?.full_name} src={d.doctor?.avatar_url ?? undefined} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold">{d.doctor?.full_name ?? 'Doctor'}</div>
              <div className="text-xs text-ink-muted mt-0.5">
                {d.doctor?.doctor_profile?.specialty ?? 'Specialist'}
              </div>
              <div className="mt-2"><Badge tone={tone.tone}>{tone.label}</Badge></div>
            </div>
          </div>
        </Card>

        <Card className="space-y-2 text-sm">
          <Row label="Date & time" value={`${fmtDate(d.scheduled_at, { weekday: 'long', month: 'short', day: 'numeric' })} · ${fmtTime(d.scheduled_at)}`} />
          <Row label="Consultation" value={d.mode === 'video' ? 'Video call' : d.mode === 'clinic' ? 'Clinic visit' : 'Home visit'} />
          <Row label="Duration" value={`${d.duration_minutes} min`} />
          <Row label="Fee" value={<span className="font-bold text-brand-700 dark:text-brand-300">{fmtMoney(d.fee)}</span>} />
          {d.doctor_notes && (
            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
              <div className="text-xs font-semibold text-ink-muted">Doctor's notes</div>
              <p className="mt-1 text-sm">{d.doctor_notes}</p>
            </div>
          )}
        </Card>

        {d.reason && (
          <Card>
            <div className="text-sm font-semibold mb-1">Your reason</div>
            <p className="text-sm text-ink-soft dark:text-slate-300 leading-relaxed">{d.reason}</p>
          </Card>
        )}

        {d.status === 'cancelled' && d.cancel_reason && (
          <Alert tone="info" title="Reason for cancellation">{d.cancel_reason}</Alert>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-2">
          <Button variant="outline" fullWidth loading={messaging} onClick={handleMessage}
            leftIcon={<MessageSquare className="h-4 w-4" />}>
            Message
          </Button>
          {d.status === 'confirmed' && d.mode === 'video' && inFuture && (
            <button
              type="button"
              className="inline-flex flex-1 h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 shadow-sm"
              onClick={() => navigate(`/appointments/${d.id}/call`)}
            >
              <Video className="h-4 w-4" /> Join call
            </button>
          )}
        </div>

        {canCancel && (
          <Button
            variant="outline"
            fullWidth
            loading={cancelling}
            onClick={handleCancel}
            className="!border-danger !text-danger hover:!bg-danger-soft"
          >
            Cancel appointment
          </Button>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
