import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { listPublishedTips } from '@/lib/api/healthTips';
import { fmtDate } from '@/lib/format';

export function HealthTipsPage() {
  const tips = useAsync(() => listPublishedTips(50), []);
  return (
    <>
      <Header title="Health tips" showBack />
      <div className="mx-auto max-w-xl px-4 py-4 space-y-3 pb-24">
        {tips.loading ? (
          [0,1,2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : tips.error ? (
          <ErrorState onRetry={tips.refetch} />
        ) : (tips.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="h-5 w-5" />}
            title="No health tips yet"
            description="Check back soon — your care team posts new tips here."
          />
        ) : (
          tips.data!.map((t) => (
            <Link
              key={t.id}
              to={`/tips/${t.id}`}
              className="block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-3 shadow-card hover:shadow-pop transition"
            >
              <div className="flex items-start gap-3">
                {t.image_url ? (
                  <img src={t.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-accent-50 dark:bg-accent-500/15 text-accent-700 dark:text-accent-500">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {t.category && <Badge tone="brand">{t.category}</Badge>}
                  <div className="mt-1 text-sm font-bold line-clamp-2">{t.title}</div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">{t.published_at ? fmtDate(t.published_at) : ''}</div>
                  <p className="mt-1 text-xs text-ink-soft dark:text-slate-300 line-clamp-2">{t.body}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
