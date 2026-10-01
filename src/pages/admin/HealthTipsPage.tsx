import { useState, type FormEvent } from 'react';
import { Edit2, Eye, Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  createTip, deleteTip, listAllTips, updateTip, type HealthTip,
} from '@/lib/api/healthTips';
import { fmtDate } from '@/lib/format';

export function AdminHealthTipsPage() {
  const { user } = useAuth();
  const tips = useAsync(() => listAllTips(), []);
  const [editing, setEditing] = useState<HealthTip | 'new' | null>(null);

  return (
    <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">Health tips</h1>
          <p className="mt-1 text-xs text-ink-muted">
            Broadcast health content to every patient's home screen.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>
          New tip
        </Button>
      </header>

      {tips.loading ? (
        <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : tips.error ? (
        <ErrorState onRetry={tips.refetch} />
      ) : (tips.data ?? []).length === 0 ? (
        <Card><EmptyState title="No tips yet" description="Create your first health tip to broadcast." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tips.data!.map((t) => (
            <TipRow key={t.id} tip={t} onEdit={() => setEditing(t)} onChange={tips.refetch} />
          ))}
        </div>
      )}

      {editing && (
        <TipEditor
          tip={editing === 'new' ? null : editing}
          authorId={user?.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); tips.refetch(); }}
        />
      )}
    </div>
  );
}

function TipRow({ tip, onEdit, onChange }: { tip: HealthTip; onEdit: () => void; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const togglePublish = async () => {
    setBusy(true);
    try { await updateTip(tip.id, { is_published: !tip.is_published }); onChange(); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm('Delete this tip? This cannot be undone.')) return;
    setBusy(true);
    try { await deleteTip(tip.id); onChange(); }
    finally { setBusy(false); }
  };
  return (
    <Card>
      <div className="flex items-start gap-3">
        {tip.image_url ? (
          <img src={tip.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-300 text-xl font-bold">
            {tip.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={tip.is_published ? 'success' : 'neutral'}>
              {tip.is_published ? 'Published' : 'Draft'}
            </Badge>
            {tip.category && <Badge tone="brand">{tip.category}</Badge>}
          </div>
          <div className="mt-1 text-sm font-bold truncate">{tip.title}</div>
          <div className="mt-0.5 text-[11px] text-ink-muted">
            {tip.published_at ? `Published ${fmtDate(tip.published_at)}` : `Updated ${fmtDate(tip.updated_at)}`}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft dark:text-slate-300 line-clamp-2">{tip.body}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-3.5 w-3.5" />} onClick={onEdit}>Edit</Button>
        <Button variant="outline" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />} loading={busy} onClick={togglePublish}>
          {tip.is_published ? 'Unpublish' : 'Publish'}
        </Button>
        <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} loading={busy} onClick={remove}>Delete</Button>
      </div>
    </Card>
  );
}

function TipEditor({ tip, authorId, onClose, onSaved }: {
  tip: HealthTip | null;
  authorId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle]       = useState(tip?.title ?? '');
  const [body, setBody]         = useState(tip?.body ?? '');
  const [category, setCategory] = useState(tip?.category ?? '');
  const [imageUrl, setImageUrl] = useState(tip?.image_url ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | undefined>();

  const save = async (publish: boolean) => {
    if (title.trim().length < 2) return setError('Title is too short.');
    if (body.trim().length < 2)  return setError('Body is too short.');
    setError(undefined);
    setSubmitting(true);
    try {
      if (tip) {
        await updateTip(tip.id, {
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || null,
          image_url: imageUrl.trim() || null,
          is_published: publish ? true : tip.is_published,
        });
      } else {
        await createTip({
          title: title.trim(),
          body: body.trim(),
          category: category.trim() || null,
          imageUrl: imageUrl.trim() || null,
          publish,
          authorId: authorId ?? null,
        });
      }
      onSaved();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save tip.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); save(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <form onSubmit={submit} className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="text-sm font-bold">{tip ? 'Edit tip' : 'New health tip'}</div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 5 ways to lower blood pressure" />
          <Input label="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. nutrition, mental-health" />
          <Input label="Image URL (optional)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft dark:text-slate-300">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write the full health tip here. Supports plain text — users will see it formatted with paragraph breaks."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
        </div>

        <footer className="flex gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="button" variant="outline" fullWidth loading={submitting} onClick={() => save(false)}>Save draft</Button>
          <Button type="button" fullWidth loading={submitting} onClick={() => save(true)}>
            {tip?.is_published ? 'Save' : 'Publish'}
          </Button>
        </footer>
      </form>
    </div>
  );
}
