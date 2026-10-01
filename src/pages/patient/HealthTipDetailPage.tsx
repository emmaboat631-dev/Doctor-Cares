import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getTip } from '@/lib/api/healthTips';
import { fmtDate } from '@/lib/format';

export function HealthTipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tip = useAsync(() => (id ? getTip(id) : Promise.resolve(null)), [id]);

  if (tip.loading) return (<><Header title="Health tip" showBack /><LoadingSpinner fullScreen /></>);
  if (!tip.data || !tip.data.is_published) {
    return (<><Header title="Health tip" showBack /><EmptyState title="Not found" description="This tip may have been removed." /></>);
  }

  return (
    <>
      <Header title="Health tip" showBack />
      <article className="mx-auto max-w-xl px-4 py-4 pb-20">
        {tip.data.image_url && (
          <img src={tip.data.image_url} alt="" className="mb-4 w-full rounded-2xl object-cover max-h-72" />
        )}
        {tip.data.category && <Badge tone="brand">{tip.data.category}</Badge>}
        <h1 className="mt-2 text-xl font-bold tracking-tight leading-tight">{tip.data.title}</h1>
        <div className="mt-1 text-[11px] text-ink-muted">{tip.data.published_at ? fmtDate(tip.data.published_at) : ''}</div>
        <Card className="mt-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink dark:text-ink-onDark">
            {tip.data.body}
          </div>
        </Card>
      </article>
    </>
  );
}
