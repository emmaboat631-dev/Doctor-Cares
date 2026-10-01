import { useState } from 'react';
import { CheckCircle2, Download, FileText, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  listAllClaims, updateClaimStatus,
  STATUS_LABEL, STATUS_TONE,
  type ClaimStatus, type NhisClaim,
} from '@/lib/api/nhisClaims';
import { fmtDate, fmtMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

const TABS: { key: ClaimStatus | 'all'; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'approved',  label: 'Approved' },
  { key: 'rejected',  label: 'Rejected' },
  { key: 'paid',      label: 'Paid' },
  { key: 'all',       label: 'All' },
];

export function AdminNhisClaimsPage() {
  const [tab, setTab] = useState<ClaimStatus | 'all'>('submitted');
  const claims = useAsync(() => listAllClaims(tab === 'all' ? undefined : tab), [tab]);

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">NHIS claims</h1>
          <p className="mt-1 text-xs text-ink-muted">Review claims filed by doctors and update their status.</p>
        </div>
        <Button leftIcon={<Download className="h-4 w-4" />} variant="outline">Export</Button>
      </header>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-bold transition border',
              tab === t.key
                ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-ink-soft dark:text-slate-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {claims.loading ? (
        <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : claims.error ? (
        <ErrorState onRetry={claims.refetch} />
      ) : (claims.data ?? []).length === 0 ? (
        <Card><EmptyState icon={<FileText className="h-5 w-5" />} title="No claims" description="None at this status." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {claims.data!.map((c) => <ClaimRow key={c.id} c={c} onChange={claims.refetch} />)}
        </div>
      )}
    </div>
  );
}

function ClaimRow({ c, onChange }: { c: NhisClaim; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState(c.admin_notes ?? '');
  const act = async (status: ClaimStatus) => {
    setBusy(true);
    try { await updateClaimStatus(c.id, status, notes || undefined); onChange(); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <div className="flex items-start gap-3 mb-2">
        <Avatar name={c.patient?.full_name} src={c.patient?.avatar_url ?? undefined} size="md" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{c.patient?.full_name ?? 'Patient'}</div>
          <div className="text-[11px] text-ink-muted truncate">
            Filed by Dr. {c.doctor?.full_name ?? '—'} · {fmtDate(c.created_at)}
          </div>
        </div>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
      </div>

      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-ink-muted">NHIS #</span><span className="font-mono">{c.nhis_number}</span></div>
        <div className="flex justify-between"><span className="text-ink-muted">Amount</span><span className="font-bold">{fmtMoney(c.amount)}</span></div>
        {c.diagnosis && <div><div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mt-1">Diagnosis</div><div>{c.diagnosis}</div></div>}
        {c.services  && <div><div className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mt-1">Services</div><div className="whitespace-pre-wrap text-xs">{c.services}</div></div>}
      </div>

      {(c.status === 'submitted' || c.status === 'approved') && (
        <>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} placeholder="Admin notes (visible on review)"
            className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            {c.status === 'submitted' ? (
              <>
                <Button variant="outline" fullWidth loading={busy} onClick={() => act('rejected')}
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                  className="!text-danger !border-danger/40">Reject</Button>
                <Button fullWidth loading={busy} onClick={() => act('approved')}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>Approve</Button>
              </>
            ) : (
              <Button fullWidth loading={busy} onClick={() => act('paid')}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                className="col-span-2">Mark as paid</Button>
            )}
          </div>
        </>
      )}
      {c.admin_notes && c.status === 'rejected' && (
        <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/15 p-2 text-xs text-rose-700 dark:text-rose-300">
          <strong>Rejection reason:</strong> {c.admin_notes}
        </div>
      )}
    </Card>
  );
}
