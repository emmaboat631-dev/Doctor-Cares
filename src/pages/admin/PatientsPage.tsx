import { useMemo, useState } from 'react';
import { Search, UserX, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { listAdminPatients, setAccountStatus } from '@/lib/api/admin';
import { fmtDate } from '@/lib/format';

type Filter = 'all' | 'active' | 'suspended';

export function AdminPatientsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const patients = useAsync(() => listAdminPatients(), []);

  const filtered = useMemo(() => {
    let list = patients.data ?? [];
    if (filter === 'active')    list = list.filter((p) => p.profile.status === 'active');
    if (filter === 'suspended') list = list.filter((p) => p.profile.status === 'suspended');
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => (p.profile.full_name ?? '').toLowerCase().includes(s));
  }, [patients.data, filter, search]);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); setError(undefined);
    try { await fn(); await patients.refetch(); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? 'Could not update.'); }
    finally { setBusy(null); }
  };

  return (
    <>
      <Header title="Patients" />
      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Chip label="All"       active={filter === 'all'}       onClick={() => setFilter('all')} />
          <Chip label="Active"    active={filter === 'active'}    onClick={() => setFilter('active')} />
          <Chip label="Suspended" active={filter === 'suspended'} onClick={() => setFilter('suspended')} tone="danger" />
          <div className="ml-auto min-w-[220px]">
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />} placeholder="Search patients…" type="search" />
          </div>
        </div>

        {error && <Card className="bg-danger-soft border-danger/30 text-danger text-sm">{error}</Card>}

        {patients.loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : patients.error ? (
          <ErrorState onRetry={patients.refetch} description={patients.error} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-5 w-5" />} title="No patients match" />
        ) : (
          <Card padding="none">
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filtered.map((p) => (
                <div key={p.profile.id} className="p-4 flex items-center gap-3">
                  <Avatar name={p.profile.full_name} src={p.profile.avatar_url ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold truncate">{p.profile.full_name ?? 'Patient'}</span>
                      {p.profile.status === 'suspended' && <Badge tone="danger">Suspended</Badge>}
                      {p.profile.status === 'active' && <Badge tone="success">Active</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {p.appointment_count} appointment{p.appointment_count === 1 ? '' : 's'}
                      {' · joined '}{fmtDate(p.profile.created_at, { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {p.profile.status === 'suspended' ? (
                      <Button size="sm" variant="outline" loading={busy === p.profile.id}
                        onClick={() => act(p.profile.id, () => setAccountStatus(p.profile.id, 'active'))}>
                        Reactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" loading={busy === p.profile.id}
                        className="!text-danger !border-danger/40 hover:!bg-danger-soft"
                        onClick={() => act(p.profile.id, () => setAccountStatus(p.profile.id, 'suspended'))}
                        leftIcon={<UserX className="h-3.5 w-3.5" />}>
                        Suspend
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function Chip({
  label, active, onClick, tone,
}: {
  label: string; active: boolean; onClick: () => void; tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
          : `border-slate-300 dark:border-slate-700 ${tone === 'danger' ? 'text-danger' : 'text-ink-soft dark:text-slate-300'} hover:bg-slate-50 dark:hover:bg-slate-800`
      }`}
    >
      {label}
    </button>
  );
}
