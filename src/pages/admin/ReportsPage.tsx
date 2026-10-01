import { useState } from 'react';
import { CheckCircle2, Flag, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { dismissReport, listAdminReports, resolveReport } from '@/lib/api/admin';
import { fmtRelative } from '@/lib/format';
import type { ReportPriority, ReportStatus } from '@/types';
import { cn } from '@/lib/cn';

const priorityTone: Record<ReportPriority, 'brand' | 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'info', medium: 'warning', high: 'danger',
};

export function AdminReportsPage() {
  const [status, setStatus] = useState<ReportStatus>('open');
  const [busy, setBusy] = useState<string | null>(null);
  const reports = useAsync(() => listAdminReports(status), [status]);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    try { await fn(); await reports.refetch(); }
    finally { setBusy(null); }
  };

  return (
    <>
      <Header title="Reports" />
      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {(['open', 'resolved', 'dismissed'] as ReportStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition',
                status === s
                  ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                  : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {reports.loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : reports.error ? (
          <ErrorState onRetry={reports.refetch} description={reports.error} />
        ) : (reports.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Flag className="h-5 w-5" />}
            title={status === 'open' ? 'No open reports' : status === 'resolved' ? 'No resolved reports' : 'No dismissed reports'}
            description={status === 'open' ? 'The moderation queue is empty.' : ''}
          />
        ) : (
          <div className="space-y-2">
            {reports.data!.map((r) => (
              <Card key={r.id} className={cn(
                'border-l-4',
                r.priority === 'high'   && 'border-l-danger',
                r.priority === 'medium' && 'border-l-warning',
                r.priority === 'low'    && 'border-l-info',
              )}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={priorityTone[r.priority]} className="capitalize">{r.priority} priority</Badge>
                    <Badge tone="neutral" className="font-mono text-[10px]">#{r.id.slice(0, 8)}</Badge>
                    <Badge tone="neutral" className="capitalize">target: {r.target_type}</Badge>
                  </div>
                  <span className="text-[11px] text-ink-muted whitespace-nowrap">{fmtRelative(r.created_at)}</span>
                </div>

                <div className="text-sm font-bold">{r.reason.split('\n')[0].slice(0, 120)}</div>
                {r.reason.length > 120 && (
                  <p className="mt-1 text-xs text-ink-soft dark:text-slate-300 leading-relaxed">{r.reason}</p>
                )}

                {r.reporter && (
                  <div className="mt-2 text-[11px] text-ink-muted">
                    Reported by <span className="font-semibold text-ink-soft dark:text-slate-300">{r.reporter.full_name ?? 'Anonymous'}</span> ({r.reporter.role})
                  </div>
                )}

                {r.status === 'open' && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button size="sm" loading={busy === r.id} onClick={() => act(r.id, () => resolveReport(r.id))}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>
                      Resolve
                    </Button>
                    <Button size="sm" variant="outline" loading={busy === r.id}
                      onClick={() => act(r.id, () => dismissReport(r.id))}
                      leftIcon={<XCircle className="h-3.5 w-3.5" />}>
                      Dismiss
                    </Button>
                  </div>
                )}
                {r.status !== 'open' && r.resolution_note && (
                  <div className="mt-2 text-[11px] text-ink-muted italic">Note: {r.resolution_note}</div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
