import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  listIncomingReferrals, updateReferralStatus,
  STATUS_LABEL, STATUS_TONE, type Referral, type ReferralStatus,
} from '@/lib/api/referrals';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'pending' | 'all';

export function DoctorReferralsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('pending');
  const incoming = useAsync(() => (user ? listIncomingReferrals(user.id) : Promise.resolve([])), [user?.id]);

  const list = (incoming.data ?? []).filter((r) => tab === 'all' || r.status === 'pending');

  return (
    <>
      <Header title="Incoming referrals" />
      <div className="mx-auto max-w-3xl px-5 pt-4 pb-6 space-y-4">
        <div className="flex gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {(['pending', 'all'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={cn(
                'flex-1 rounded-full py-2.5 text-xs font-bold capitalize transition',
                tab === t ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink shadow-sm' : 'text-ink-soft dark:text-slate-300',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {incoming.loading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
        ) : incoming.error ? (
          <ErrorState onRetry={incoming.refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Share2 className="h-5 w-5" />}
            title={tab === 'pending' ? 'No pending referrals' : 'No referrals yet'}
            description="When colleagues refer their patients to you, they appear here."
          />
        ) : (
          <div className="space-y-3">
            {list.map((r) => <IncomingCard key={r.id} r={r} onChange={incoming.refetch} />)}
          </div>
        )}
      </div>
    </>
  );
}

function IncomingCard({ r, onChange }: { r: Referral; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (status: ReferralStatus) => {
    setBusy(true);
    try { await updateReferralStatus(r.id, status); onChange(); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <div className="flex items-center gap-3 mb-2">
        <Avatar name={r.patient?.full_name} src={r.patient?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{r.patient?.full_name ?? 'Patient'}</div>
          <div className="text-[11px] text-ink-muted truncate">
            From Dr. {r.from_doctor?.full_name ?? '—'} · {fmtDate(r.created_at)}
          </div>
        </div>
        <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
      </div>
      <div className="rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-200/70 dark:border-brand-500/20 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Reason</div>
        <div className="mt-0.5 text-sm">{r.reason}</div>
        {r.notes && (
          <>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">Notes</div>
            <div className="mt-0.5 text-xs whitespace-pre-wrap">{r.notes}</div>
          </>
        )}
      </div>
      {r.status === 'pending' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" fullWidth loading={busy} onClick={() => act('declined')}>Decline</Button>
          <Button fullWidth loading={busy} onClick={() => act('accepted')}>Accept</Button>
        </div>
      )}
      {r.status === 'accepted' && r.patient?.id && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to={`/patients/${r.patient.id}`} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800">
            View patient
          </Link>
          <Button fullWidth loading={busy} onClick={() => act('completed')}>Mark completed</Button>
        </div>
      )}
    </Card>
  );
}
