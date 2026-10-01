import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, Droplet, Heart, MessageSquare, Scale, Share2, Thermometer, Wind } from 'lucide-react';
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
import {
  listOutgoingReferrals, STATUS_LABEL, STATUS_TONE, type Referral,
} from '@/lib/api/referrals';
import { Badge } from '@/components/ui/Badge';
import { ReferralModal } from '@/components/doctor/ReferralModal';
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
  const [referOpen, setReferOpen] = useState(false);
  const referrals = useAsync(
    async () => (user ? listOutgoingReferrals(user.id) : []),
    [user?.id],
  );
  const patientReferrals = (referrals.data ?? []).filter((r) => r.patient_id === id);
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

        {m && (m.date_of_birth || m.gender || m.blood_group || m.height_cm) ? (
          <Card>
            <div className="text-sm font-semibold mb-2">Demographics</div>
            <div className="grid gap-1.5 text-sm">
              {m.date_of_birth && <Row label="Date of birth" value={fmtDate(m.date_of_birth, { year: 'numeric', month: 'short', day: 'numeric' })} />}
              {m.gender        && <Row label="Gender" value={m.gender} />}
              {m.blood_group   && <Row label="Blood group" value={m.blood_group} />}
              {m.height_cm != null && <Row label="Height" value={`${m.height_cm} cm`} />}
            </div>
          </Card>
        ) : null}

        <MedicalHistoryCard m={m} />

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

        <ReferralsCard referrals={patientReferrals} />

        {msgError && <Alert tone="error">{msgError}</Alert>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" fullWidth loading={messaging} onClick={handleMessage}
            leftIcon={<MessageSquare className="h-4 w-4" />}>
            Message
          </Button>
          <Button variant="outline" fullWidth onClick={() => setReferOpen(true)}
            leftIcon={<Share2 className="h-4 w-4" />}>
            Refer
          </Button>
        </div>
      </div>

      {user && id && (
        <ReferralModal
          open={referOpen}
          onClose={() => setReferOpen(false)}
          patientId={id}
          patientName={p.full_name}
          fromDoctorId={user.id}
          onCreated={referrals.refetch}
        />
      )}
    </>
  );
}

function ReferralsCard({ referrals }: { referrals: Referral[] }) {
  if (referrals.length === 0) return null;
  return (
    <Card>
      <div className="text-sm font-semibold mb-2">Your referrals for this patient</div>
      <div className="space-y-2">
        {referrals.map((r) => (
          <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold truncate flex-1">
                → Dr. {r.to_doctor?.full_name ?? '—'}
              </span>
              <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
            </div>
            <div className="mt-1 text-xs text-ink-soft dark:text-slate-300">{r.reason}</div>
            <div className="mt-0.5 text-[10px] text-ink-muted">{fmtDate(r.created_at)}</div>
          </div>
        ))}
      </div>
    </Card>
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

type Med = {
  allergies?: string | null;
  chronic_conditions?: string[] | null;
  current_medications?: string[] | null;
  immunizations?: string[] | null;
  past_surgeries?: string | null;
  family_history?: string | null;
  smoking_status?: string | null;
  alcohol_use?: string | null;
};

function MedicalHistoryCard({ m }: { m: Med | null | undefined }) {
  if (!m) return null;
  const hasAny =
    m.allergies ||
    (m.chronic_conditions?.length ?? 0) > 0 ||
    (m.current_medications?.length ?? 0) > 0 ||
    (m.immunizations?.length ?? 0) > 0 ||
    m.past_surgeries ||
    m.family_history ||
    m.smoking_status ||
    m.alcohol_use;

  if (!hasAny) {
    return (
      <Card>
        <div className="text-sm font-semibold mb-1">Medical history</div>
        <div className="text-xs text-ink-muted">Patient hasn't filled in their medical history yet.</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="text-sm font-semibold mb-2">Medical history</div>
      <div className="space-y-3 text-sm">
        {m.allergies && <Section label="Allergies">{m.allergies}</Section>}
        {(m.chronic_conditions?.length ?? 0) > 0 && (
          <ChipList label="Chronic conditions" items={m.chronic_conditions!} tone="rose" />
        )}
        {(m.current_medications?.length ?? 0) > 0 && (
          <ChipList label="Current medications" items={m.current_medications!} tone="brand" />
        )}
        {(m.immunizations?.length ?? 0) > 0 && (
          <ChipList label="Immunizations" items={m.immunizations!} tone="emerald" />
        )}
        {m.past_surgeries   && <Section label="Past surgeries">{m.past_surgeries}</Section>}
        {m.family_history   && <Section label="Family history">{m.family_history}</Section>}
        {(m.smoking_status || m.alcohol_use) && (
          <div className="grid grid-cols-2 gap-2">
            {m.smoking_status && <KeyValue label="Smoking" value={m.smoking_status} />}
            {m.alcohol_use    && <KeyValue label="Alcohol"  value={m.alcohol_use} />}
          </div>
        )}
      </div>
    </Card>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

const CHIP_TONES = {
  rose:    'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
} as const;

function ChipList({ label, items, tone }: { label: string; items: string[]; tone: keyof typeof CHIP_TONES }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={`${it}-${i}`} className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', CHIP_TONES[tone])}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-0.5 text-sm font-semibold capitalize">{value}</div>
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
