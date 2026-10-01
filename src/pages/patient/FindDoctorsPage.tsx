import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DoctorCard } from '@/components/patient/DoctorCard';
import { useAsync } from '@/hooks/useAsync';
import { listDoctors, listSpecialties, type DoctorListItem } from '@/lib/api/doctors';
import { listProviders } from '@/lib/api/providers';
import { cn } from '@/lib/cn';

type Tab = 'doctor' | 'nurse';

export function FindDoctorsPage() {
  const [params] = useSearchParams();
  const initialTab = (params.get('role') === 'nurse' ? 'nurse' : 'doctor') as Tab;
  const [tab, setTab]           = useState<Tab>(initialTab);
  const [search, setSearch]     = useState('');
  const [specialty, setSpecialty] = useState<string | null>(null);

  const specialties = useAsync(() => listSpecialties(), []);
  const doctors = useAsync<DoctorListItem[]>(
    async () => {
      if (tab === 'doctor') return listDoctors({ search, specialty });
      // Nurses: use the shared providers view, filter by role.
      const rows = await listProviders({ search, role: 'nurse', limit: 40 });
      // Shape into the DoctorListItem the shared card expects. specialization
      // maps to specialty; profile is pulled from the top-level fields.
      return rows.map((r) => ({
        id: r.id,
        specialty: r.specialization,
        qualifications: r.qualifications,
        bio: r.bio,
        years_experience: r.years_experience,
        consultation_fee: r.consultation_fee,
        modes: r.modes,
        is_verified: r.is_verified,
        rating: r.rating,
        rating_count: r.rating_count,
        clinic_address: r.clinic_address,
        languages: r.languages,
        updated_at: new Date().toISOString(),
        profile: {
          id: r.id,
          full_name: r.full_name,
          avatar_url: r.avatar_url,
          status: 'active',
        },
      }) as unknown as DoctorListItem);
    },
    [tab, search, specialty],
  );

  const filterChips = useMemo(() => ['All', ...(specialties.data ?? [])], [specialties.data]);

  return (
    <>
      <Header title={tab === 'doctor' ? 'Find doctors' : 'Find nurses'} />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <div className="flex gap-1 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          {(['doctor', 'nurse'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setSpecialty(null); }}
              aria-pressed={tab === t}
              className={cn(
                'flex-1 rounded-full py-2.5 text-xs font-bold capitalize transition',
                tab === t ? 'bg-ink text-white dark:bg-ink-onDark dark:text-ink shadow-sm'
                          : 'text-ink-soft dark:text-slate-300',
              )}
            >
              {t === 'doctor' ? 'Doctors' : 'Nurses'}
            </button>
          ))}
        </div>

        <Input
          leftIcon={<Search className="h-4 w-4" />}
          placeholder="Search by name or specialty"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
          aria-label="Search doctors"
        />

        {tab === 'doctor' && (
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
        )}

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
            title={search || specialty
              ? `No ${tab === 'doctor' ? 'doctors' : 'nurses'} match`
              : `No ${tab === 'doctor' ? 'doctors' : 'nurses'} yet`}
            description={
              search || specialty
                ? 'Try a different search or clear the specialty filter.'
                : `Ask your admin to verify a ${tab === 'doctor' ? 'doctor' : 'nurse'} account so they show up here.`
            }
          />
        )}
      </div>
    </>
  );
}
