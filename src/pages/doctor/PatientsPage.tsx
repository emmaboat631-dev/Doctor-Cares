import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listMyPatients } from '@/lib/api/patients';
import { fmtDate } from '@/lib/format';

export function DoctorPatientsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const patients = useAsync(async () => (user ? listMyPatients(user.id) : []), [user?.id]);

  const filtered = useMemo(() => {
    const list = patients.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p) => (p.profile.full_name ?? '').toLowerCase().includes(s));
  }, [patients.data, search]);

  return (
    <>
      <Header title="My patients" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        <div className="rounded-xl border border-info/30 bg-info-soft/60 px-3 py-2 text-xs text-sky-800 dark:text-sky-300 dark:bg-sky-500/10">
          You only see patients you've had appointments with — enforced by row-level security in the database.
        </div>

        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search patients"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
          aria-label="Search patients"
        />

        {patients.loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : patients.error ? (
          <ErrorState onRetry={patients.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={search ? 'No patients match' : 'No patients yet'}
            description={search ? 'Try a different name.' : 'Patients will appear here after their first appointment.'}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Link
                key={p.profile.id}
                to={`/patients/${p.profile.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card px-3 py-3 hover:shadow-pop transition"
              >
                <Avatar name={p.profile.full_name} src={p.profile.avatar_url ?? undefined} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-semibold">{p.profile.full_name ?? 'Patient'}</div>
                    {p.next_visit_at ? (
                      <Badge tone="success">Next: {fmtDate(p.next_visit_at)}</Badge>
                    ) : p.visit_count > 0 ? (
                      <Badge tone="neutral">Past</Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {p.visit_count} visit{p.visit_count === 1 ? '' : 's'}
                    {p.last_visit_at ? ` · last ${fmtDate(p.last_visit_at)}` : ''}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
