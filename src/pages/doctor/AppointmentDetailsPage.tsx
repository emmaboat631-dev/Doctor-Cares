import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, MessageSquare, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getAppointmentForDoctor, setAppointmentStatus, updateDoctorNotes } from '@/lib/api/appointments';
import { openConversationWith } from '@/lib/api/chat';
import { getPatientForDoctor } from '@/lib/api/patients';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import type { AppointmentStatus } from '@/types';

const statusTone: Record<AppointmentStatus, { tone: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'; label: string }> = {
  pending:   { tone: 'warning', label: 'Pending confirmation' },
  confirmed: { tone: 'success', label: 'Confirmed' },
  cancelled: { tone: 'danger',  label: 'Cancelled' },
  completed: { tone: 'info',    label: 'Completed' },
  rejected:  { tone: 'danger',  label: 'Declined' },
};

export function DoctorAppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const appt = useAsync(() => (id ? getAppointmentForDoctor(id) : Promise.resolve(null)), [id]);
  const patientId = appt.data?.patient_id ?? null;
  const patient = useAsync(async () => (patientId ? getPatientForDoctor(patientId) : null), [patientId]);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleMessage = async () => {
    if (!appt.data?.patient_id) return;
    setMessaging(true);
    try {
      const cid = await openConversationWith(appt.data.patient_id);
      navigate(`/chat/${cid}`);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not open the conversation.');
    } finally {
      setMessaging(false);
    }
  };

  useEffect(() => { setNotes(appt.data?.doctor_notes ?? ''); }, [appt.data?.doctor_notes]);

  const saveNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await updateDoctorNotes(id, notes.trim() || null);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const act = async (status: 'confirmed' | 'rejected' | 'completed') => {
    if (!id) return;
    setBusy(true);
    setError(undefined);
    try {
      await setAppointmentStatus(id, status);
      if (status === 'rejected') navigate('/appointments');
      else await appt.refetch();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not update status.');
    } finally {
      setBusy(false);
    }
  };

  if (appt.loading) return (<><Header title="Appointment" showBack /><LoadingSpinner fullScreen /></>);
  if (!appt.data) return (<><Header title="Appointment" showBack /><EmptyState title="Appointment not found" /></>);

  const d = appt.data;
  const tone = statusTone[d.status];
  const canAccept = d.status === 'pending';
  const canComplete = d.status === 'confirmed';

  return (
    <>
      <Header title="Appointment" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card className="bg-brand-50 dark:bg-brand-500/10 border-brand-100 dark:border-brand-500/20">
          <div className="flex items-center gap-3">
            <Avatar name={d.patient?.full_name} src={d.patient?.avatar_url ?? undefined} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold">{d.patient?.full_name ?? 'Patient'}</div>
              <div className="text-xs text-ink-muted mt-0.5">
                {fmtDate(d.scheduled_at, { weekday: 'long', month: 'short', day: 'numeric' })} · {fmtTime(d.scheduled_at)}
              </div>
              <div className="mt-2"><Badge tone={tone.tone}>{tone.label}</Badge></div>
            </div>
          </div>
        </Card>

        {d.reason && (
          <Card>
            <div className="text-sm font-semibold mb-1">Reason for visit</div>
            <p className="text-sm text-ink-soft dark:text-slate-300 leading-relaxed">{d.reason}</p>
          </Card>
        )}

        <Card>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Clinical notes</div>
            {notesSaved && <span className="text-[11px] text-success font-semibold">Saved ✓</span>}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Findings, plan, follow-up… (only visible to you and the patient after completion)"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-muted">{notes.length}/4000</span>
            <Button size="sm" variant="outline" loading={savingNotes} onClick={saveNotes}>Save notes</Button>
          </div>
        </Card>

        {patient.data?.medical && (patient.data.medical.blood_group || patient.data.medical.allergies || patient.data.medical.date_of_birth) && (
          <Card>
            <div className="text-sm font-semibold mb-2">Patient history</div>
            <div className="grid gap-1.5 text-sm">
              {patient.data.medical.date_of_birth && <Row label="DOB" value={patient.data.medical.date_of_birth} />}
              {patient.data.medical.gender && <Row label="Gender" value={patient.data.medical.gender} />}
              {patient.data.medical.blood_group && <Row label="Blood group" value={patient.data.medical.blood_group} />}
              {patient.data.medical.allergies && <Row label="Allergies" value={patient.data.medical.allergies} />}
            </div>
          </Card>
        )}

        <Card>
          <div className="text-sm font-semibold mb-2">Details</div>
          <div className="grid gap-1.5 text-sm">
            <Row label="Consultation" value={d.mode === 'video' ? 'Video call' : d.mode === 'clinic' ? 'Clinic visit' : 'Home visit'} />
            <Row label="Duration" value={`${d.duration_minutes} min`} />
            <Row label="Fee" value={<span className="font-bold text-brand-700 dark:text-brand-300">{fmtMoney(d.fee)}</span>} />
          </div>
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex flex-col gap-2">
          {canAccept && (
            <>
              <Button loading={busy} onClick={() => act('confirmed')} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
                Accept &amp; confirm
              </Button>
              <Button variant="outline" loading={busy} onClick={() => act('rejected')}
                className="!text-danger !border-danger/40 hover:!bg-danger-soft"
                leftIcon={<XCircle className="h-4 w-4" />}>
                Decline
              </Button>
            </>
          )}
          {canComplete && (
            <Button loading={busy} onClick={() => act('completed')} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Mark as completed
            </Button>
          )}
          <Button variant="outline" loading={messaging} onClick={handleMessage}
            leftIcon={<MessageSquare className="h-4 w-4" />}>
            Message patient
          </Button>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
