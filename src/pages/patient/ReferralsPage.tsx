import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  listPatientReferrals, STATUS_LABEL, STATUS_TONE,
} from '@/lib/api/referrals';
import { fmtDate } from '@/lib/format';

export function PatientReferralsPage() {
  const { user } = useAuth();
  const refs = useAsync(() => (user ? listPatientReferrals(user.id) : Promise.resolve([])), [user?.id]);

  return (
    <>
      <Header title="Referrals" showBack />
      <div className="mx-auto max-w-xl px-4 py-4 pb-24 space-y-3">
        {refs.loading ? (
          [0,1,2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
        ) : refs.error ? (
          <ErrorState onRetry={refs.refetch} />
        ) : (refs.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Share2 className="h-5 w-5" />}
            title="No referrals yet"
            description="When one of your doctors refers you to a specialist, it appears here."
          />
        ) : (
          refs.data!.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center gap-3">
                <Avatar name={r.to_doctor?.full_name} src={r.to_doctor?.avatar_url ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">Dr. {r.to_doctor?.full_name ?? 'Specialist'}</div>
                  <div className="text-[11px] text-ink-muted truncate">
                    Referred by Dr. {r.from_doctor?.full_name ?? '—'} · {fmtDate(r.created_at)}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Reason</div>
                <div className="mt-0.5 text-sm">{r.reason}</div>
              </div>
              {r.status === 'accepted' && r.to_doctor?.id && (
                <Link
                  to={`/doctors/${r.to_doctor.id}/book`}
                  className="mt-3 inline-flex w-full h-10 items-center justify-center rounded-xl bg-brand-500 text-xs font-bold text-white hover:bg-brand-600"
                >
                  Book this specialist
                </Link>
              )}
            </Card>
          ))
        )}
      </div>
    </>
  );
}
