import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, Droplet, Heart, MessageSquare, Scale, Thermometer, Wind } from 'lucide-react';
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
import {
  METRIC_SPEC, formatMetric, latestMetricsByType, type HealthMetric, type MetricType,
} from '@/lib/api/healthMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, fmtTime } from '@/lib/format';
import { cn } from '@/lib/cn';

export function DoctorPatientDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const patient = useAsync(() => (id ? getPatientForDoctor(id) : Promise.resolve(null)), [id]);
  const allAppts = useAsync(async () => (user ? listDoctorAppointments(user.id) : []), [user?.id]);
  const vitals = useAsync<Awaited<ReturnType<typeof latestMetricsByType>>>(
    async () => (id ? latestMetricsByType(id) : {}),
    [id],
  );
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

        <VitalsCard vitals={vitals.data ?? {}} loading={vitals.loading} />

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

const VITAL_ICONS: Record<MetricType, { icon: React.ReactNode; tint: string }> = {
  heart_rate:  { icon: <Heart       className="h-4 w-4" />, tint: 'text-rose-600 bg-rose-50 dark:bg-rose-500/15' },
  bp:          { icon: <Wind        className="h-4 w-4" />, tint: 'text-brand-600 bg-brand-50 dark:bg-brand-500/15' },
  temperature: { icon: <Thermometer className="h-4 w-4" />, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-500/15' },
  weight:      { icon: <Scale       className="h-4 w-4" />, tint: 'text-violet-600 bg-violet-50 dark:bg-violet-500/15' },
  glucose:     { icon: <Droplet     className="h-4 w-4" />, tint: 'text-pink-600 bg-pink-50 dark:bg-pink-500/15' },
  spo2:        { icon: <Activity    className="h-4 w-4" />, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15' },
};

function VitalsCard({ vitals, loading }: { vitals: Partial<Record<MetricType, HealthMetric>>; loading: boolean }) {
  const entries = (Object.entries(vitals) as [MetricType, HealthMetric][])
    .sort((a, b) => new Date(b[1].taken_at).getTime() - new Date(a[1].taken_at).getTime());

  return (
    <Card>
      <div className="mb-2 text-sm font-semibold">Latest vitals</div>
      {loading ? (
        <div className="text-sm text-ink-muted">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-ink-muted">Patient hasn't logged any readings yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {entries.map(([type, m]) => {
            const spec = METRIC_SPEC[type];
            const status = spec.normal(m.value, m.value2);
            const statusTint =
              status === 'normal' ? 'text-emerald-700 dark:text-emerald-300'
              : status === 'high'  ? 'text-rose-700 dark:text-rose-300'
              : 'text-brand-700 dark:text-brand-300';
            const vi = VITAL_ICONS[type];
            return (
              <div key={type} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn('grid h-6 w-6 place-items-center rounded-md', vi.tint)}>{vi.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{spec.label}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-base font-bold">{formatMetric(m)}</span>
                  <span className="text-[10px] text-ink-muted">{m.unit}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-ink-muted">{fmtDate(m.taken_at)} · {fmtTime(m.taken_at)}</span>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider', statusTint)}>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
