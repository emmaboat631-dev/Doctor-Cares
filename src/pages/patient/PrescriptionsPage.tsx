import { Download, Pill } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listPatientPrescriptions, type Prescription } from '@/lib/api/prescriptions';
import { downloadPrescriptionPdf } from '@/lib/pdf';
import { fmtDate } from '@/lib/format';

export function PrescriptionsPage() {
  const { user } = useAuth();
  const rx = useAsync(() => (user ? listPatientPrescriptions(user.id) : Promise.resolve([])), [user?.id]);

  return (
    <>
      <Header title="Prescriptions" showBack />
      <div className="mx-auto max-w-xl px-4 py-4 pb-24 space-y-3">
        {rx.loading ? (
          [0,1,2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)
        ) : rx.error ? (
          <ErrorState onRetry={rx.refetch} />
        ) : (rx.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Pill className="h-5 w-5" />}
            title="No prescriptions yet"
            description="When one of your doctors writes you a prescription, it appears here."
          />
        ) : (
          rx.data!.map((r) => <RxCard key={r.id} r={r} />)
        )}
      </div>
    </>
  );
}

function RxCard({ r }: { r: Prescription }) {
  return (
    <Card>
      <div className="flex items-start gap-3 mb-2">
        <Avatar name={r.doctor?.full_name} src={r.doctor?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">Dr. {r.doctor?.full_name ?? '—'}</div>
          <div className="text-[11px] text-ink-muted">{fmtDate(r.issued_at)}</div>
          {r.diagnosis && <div className="mt-1 text-xs text-ink-soft dark:text-slate-300">Dx: {r.diagnosis}</div>}
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
        {r.medications.map((m, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{m.name}</div>
              <div className="text-[11px] text-ink-muted">
                {m.dosage} · {m.frequency} · for {m.duration}
              </div>
              {m.instructions && <div className="text-[11px] italic text-ink-soft dark:text-slate-300 mt-0.5">{m.instructions}</div>}
            </div>
          </div>
        ))}
      </div>

      {r.notes && (
        <div className="mt-2 text-xs text-ink-soft dark:text-slate-300 whitespace-pre-wrap">{r.notes}</div>
      )}

      <Button
        className="mt-3"
        variant="outline"
        fullWidth
        leftIcon={<Download className="h-4 w-4" />}
        onClick={() => downloadPrescriptionPdf(r)}
      >
        Download PDF
      </Button>
    </Card>
  );
}
