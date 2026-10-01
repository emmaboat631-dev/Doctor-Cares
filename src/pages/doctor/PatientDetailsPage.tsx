import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppointmentCard } from '@/components/patient/AppointmentCard';
import { useAsync } from '@/hooks/useAsync';
import { getPatientForDoctor } from '@/lib/api/patients';
import { listDoctorAppointments } from '@/lib/api/appointments';
import { openConversationWith } from '@/lib/api/chat';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate } from '@/lib/format';

export function DoctorPatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const patient = useAsync(() => (id ? getPatientForDoctor(id) : Promise.resolve(null)), [id]);
  const allAppts = useAsync(async () => (user ? listDoctorAppointments(user.id) : []), [user?.id]);
  const patientAppts = (allAppts.data ?? []).filter((a) => a.patient_id === id);

  const [messaging, setMessaging] = useState(false);
  const [msgError, setMsgError] = useState<string | undefined>();
  const handleMessage = async () => {
    if (!id) return;
    setMsgError(undefined);
    setMessaging(true);
    try {
      const cid = await openConversationWith(id);
      navigate(`/chat/${cid}`);
    } catch (e: unknown) {
      setMsgError((e as { message?: string })?.message ?? 'Could not open the conversation.');
    } finally {
      setMessaging(false);
    }
  };

  if (patient.loading) return (<><Header title="Patient" showBack /><LoadingSpinner fullScreen /></>);
  if (!patient.data?.profile) {
    return (<><Header title="Patient" showBack />
      <EmptyState title="Patient not found" description="You may not have an appointment with this patient." />
    </>);
  }

  const p = patient.data.profile;
  const m = patient.data.medical;

  return (
    <>
      <Header title="Patient" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card padding="lg" className="text-center">
          <Avatar name={p.full_name} src={p.avatar_url ?? undefined} size="xl" className="mx-auto" />
          <h1 className="mt-3 text-lg font-bold">{p.full_name ?? 'Patient'}</h1>
          {p.phone && <div className="mt-1 text-xs text-ink-muted">{p.phone}</div>}
        </Card>

        {m && (m.date_of_birth || m.gender || m.blood_group || m.allergies) ? (
          <Card>
            <div className="text-sm font-semibold mb-2">Medical profile</div>
            <div className="grid gap-1.5 text-sm">
              {m.date_of_birth && <Row label="Date of birth" value={fmtDate(m.date_of_birth, { year: 'numeric', month: 'short', day: 'numeric' })} />}
              {m.gender       && <Row label="Gender" value={m.gender} />}
              {m.blood_group  && <Row label="Blood group" value={m.blood_group} />}
              {m.allergies    && <Row label="Allergies" value={m.allergies} />}
            </div>
          </Card>
        ) : (
          <Card><div className="text-sm text-ink-muted">Patient hasn't filled in their medical profile yet.</div></Card>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Appointment history</div>
            <span className="text-xs text-ink-muted">{patientAppts.length} total</span>
          </div>
          {patientAppts.length === 0 ? (
            <Card><div className="text-sm text-ink-muted">No shared appointments.</div></Card>
          ) : (
            <div className="space-y-2">
              {patientAppts.map((a) => (
                <AppointmentCard
                  key={a.id}
                  appointment={{ ...a, doctor: { id: user?.id ?? '', full_name: null, avatar_url: null, doctor_profile: null } }}
                  linkTo={`/appointments/${a.id}`}
                />
              ))}
            </div>
          )}
        </div>

        {msgError && <Alert tone="error">{msgError}</Alert>}
        <Button variant="outline" fullWidth loading={messaging} onClick={handleMessage}
          leftIcon={<MessageSquare className="h-4 w-4" />}>
          Message patient
        </Button>
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
