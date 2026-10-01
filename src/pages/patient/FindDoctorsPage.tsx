import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DoctorCard } from '@/components/patient/DoctorCard';
import { useAsync } from '@/hooks/useAsync';
import { listDoctors, listSpecialties } from '@/lib/api/doctors';
import { cn } from '@/lib/cn';

export function FindDoctorsPage() {
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);

  const specialties = useAsync(() => listSpecialties(), []);
  const doctors = useAsync(() => listDoctors({ search, specialty }), [search, specialty]);

  const filterChips = useMemo(() => ['All', ...(specialties.data ?? [])], [specialties.data]);

  return (
    <>
      <Header title="Find doctors" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by name or specialty"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
          aria-label="Search doctors"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {filterChips.map((label) => {
            const active = label === 'All' ? specialty === null : specialty === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setSpecialty(label === 'All' ? null : label)}
                aria-pressed={active}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                  active
                    ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                    : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {doctors.loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : doctors.error ? (
          <ErrorState onRetry={doctors.refetch} />
        ) : doctors.data && doctors.data.length > 0 ? (
          <div className="space-y-2">
            {doctors.data.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={search || specialty ? 'No doctors match' : 'No doctors yet'}
            description={
              search || specialty
                ? 'Try a different search or clear the specialty filter.'
                : 'Ask your admin to verify a doctor account so they show up here.'
            }
          />
        )}
      </div>
    </>
  );
}
