import { useMemo, useState } from 'react';
import { CheckCircle2, MoreVertical, Search, UserX } from 'lucide-react';
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
import { listAdminDoctors, setAccountStatus, unverifyDoctor, verifyDoctor } from '@/lib/api/admin';
import { fmtDate, fmtMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

type Filter = 'all' | 'verified' | 'pending' | 'suspended';

export function AdminDoctorsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const doctors = useAsync(() => listAdminDoctors(filter), [filter]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return doctors.data ?? [];
    return (doctors.data ?? []).filter((d) => {
      const name = (d.profile?.full_name ?? '').toLowerCase();
      const spec = (d.specialty ?? '').toLowerCase();
      return name.includes(s) || spec.includes(s);
    });
  }, [doctors.data, search]);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id); setError(undefined);
    try { await fn(); await doctors.refetch(); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? 'Could not update.'); }
    finally { setBusy(null); }
  };

  const counts = useMemo(() => {
    const list = doctors.data ?? [];
    return {
      all: list.length,
      verified: list.filter((d) => d.is_verified).length,
      pending: list.filter((d) => !d.is_verified).length,
      suspended: list.filter((d) => d.profile?.status === 'suspended').length,
    };
  }, [doctors.data]);

  return (
    <>
      <Header title="Doctors" />
      <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <FilterChip label="All" count={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterChip label="Verified" count={counts.verified} active={filter === 'verified'} onClick={() => setFilter('verified')} />
          <FilterChip label="Pending" count={counts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} tone="warning" />
          <FilterChip label="Suspended" count={counts.suspended} active={filter === 'suspended'} onClick={() => setFilter('suspended')} tone="danger" />
          <div className="ml-auto min-w-[220px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search doctors…"
              type="search"
            />
          </div>
        </div>

        {error && <Card className="bg-danger-soft border-danger/30 text-danger text-sm">{error}</Card>}

        {doctors.loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : doctors.error ? (
          <ErrorState onRetry={doctors.refetch} description={doctors.error} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No doctors match" />
        ) : (
          <Card padding="none">
            <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filtered.map((d) => (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  <Avatar name={d.profile?.full_name} src={d.profile?.avatar_url ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold truncate">{d.profile?.full_name ?? 'Doctor'}</span>
                      {d.is_verified
                        ? <Badge tone="success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                        : <Badge tone="warning">Pending</Badge>}
                      {d.profile?.status === 'suspended' && <Badge tone="danger">Suspended</Badge>}
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {d.specialty ?? 'No specialty'}
                      {d.consultation_fee != null && ` · ${fmtMoney(d.consultation_fee)}`}
                      {d.profile?.created_at && ` · joined ${fmtDate(d.profile.created_at, { month: 'short', year: 'numeric' })}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!d.is_verified && (
                      <Button size="sm" loading={busy === d.id} onClick={() => act(d.id, () => verifyDoctor(d.id))}>
                        Verify
                      </Button>
                    )}
                    {d.is_verified && d.profile?.status !== 'suspended' && (
                      <Button size="sm" variant="outline" loading={busy === d.id} onClick={() => act(d.id, () => unverifyDoctor(d.id))}>
                        Unverify
                      </Button>
                    )}
                    {d.profile?.status === 'suspended' ? (
                      <Button size="sm" variant="outline" loading={busy === d.id} onClick={() => act(d.id, () => setAccountStatus(d.id, 'active'))}>
                        Reactivate
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" loading={busy === d.id}
                        className="!text-danger !border-danger/40 hover:!bg-danger-soft"
                        onClick={() => act(d.id, () => setAccountStatus(d.id, 'suspended'))}
                        leftIcon={<UserX className="h-3.5 w-3.5" />}>
                        Suspend
                      </Button>
                    )}
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="More"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
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

function FilterChip({
  label, count, active, onClick, tone,
}: {
  label: string; count: number; active: boolean; onClick: () => void; tone?: 'warning' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
          : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
      )}
    >
      {label}
      <span className={cn(
        'inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold',
        active ? 'bg-white/20 text-white'
        : tone === 'warning' && count > 0 ? 'bg-warning text-white'
        : tone === 'danger' && count > 0 ? 'bg-danger text-white'
        : 'bg-slate-100 dark:bg-slate-800 text-ink-muted',
      )}>{count}</span>
    </button>
  );
}
