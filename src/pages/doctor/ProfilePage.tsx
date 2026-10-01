import { Link } from 'react-router-dom';
import { CalendarRange, CheckCircle2, ChevronRight, Edit, MapPin, Settings, Star, Video } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getMyDoctorProfile } from '@/lib/api/doctors';
import { fmtMoney } from '@/lib/format';

export function DoctorProfilePage() {
  const { profile, user } = useAuth();
  const doctor = useAsync(async () => (user ? getMyDoctorProfile(user.id) : null), [user?.id]);

  return (
    <>
      <Header
        title="Profile"
        right={
          <Link to="/profile/edit" aria-label="Edit profile" className="grid h-10 w-10 place-items-center rounded-full text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800">
            <Edit className="h-4 w-4" />
          </Link>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        {doctor.loading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : !doctor.data ? (
          <EmptyState
            title="Profile not set up"
            description="Ask an admin to complete your doctor profile, or edit it below to get started."
            action={<Link to="/profile/edit" className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">Fill in profile</Link>}
          />
        ) : (
          <>
            <Card padding="lg" className="text-center">
              <Avatar name={profile?.full_name} src={profile?.avatar_url ?? undefined} size="xl" className="mx-auto" />
              <h1 className="mt-3 text-lg font-bold">{profile?.full_name ?? 'Doctor'}</h1>
              <div className="mt-1 text-xs text-ink-muted">
                {doctor.data.specialty ?? 'Set your specialty'}
                {doctor.data.qualifications ? ` · ${doctor.data.qualifications}` : ''}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {doctor.data.is_verified ? (
                  <Badge tone="success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                ) : (
                  <Badge tone="warning">Pending verification</Badge>
                )}
                {doctor.data.rating != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" /> {doctor.data.rating.toFixed(1)}
                    {doctor.data.rating_count > 0 && <span className="font-normal opacity-70">({doctor.data.rating_count})</span>}
                  </span>
                )}
              </div>
            </Card>

            <Card>
              <div className="text-sm font-semibold mb-2">About</div>
              <p className="text-sm text-ink-soft dark:text-slate-300 leading-relaxed">
                {doctor.data.bio ?? <span className="italic text-ink-muted">Add a short bio so patients know who they're booking with.</span>}
              </p>
            </Card>

            <Card>
              <div className="text-sm font-semibold mb-2">Consultation</div>
              <div className="grid gap-1.5 text-sm">
                <Row label="Fee" value={<span className="font-bold text-brand-700 dark:text-brand-300">{fmtMoney(doctor.data.consultation_fee)}</span>} />
                <Row label="Years of experience" value={doctor.data.years_experience ?? '—'} />
                <div className="flex items-center justify-between gap-3 py-1 flex-wrap">
                  <span className="text-ink-muted">Modes</span>
                  <div className="flex gap-1">
                    {doctor.data.modes?.includes('video')  && <Badge tone="brand"><Video className="h-3 w-3 mr-1" />Video</Badge>}
                    {doctor.data.modes?.includes('clinic') && <Badge tone="brand"><MapPin className="h-3 w-3 mr-1" />Clinic</Badge>}
                    {!doctor.data.modes?.length && <span className="text-ink-muted text-sm">—</span>}
                  </div>
                </div>
                {doctor.data.languages?.length > 0 && <Row label="Languages" value={doctor.data.languages.join(', ')} />}
                {doctor.data.clinic_address && <Row label="Clinic address" value={doctor.data.clinic_address} />}
              </div>
            </Card>

            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <MenuRow href="/availability" icon={<CalendarRange className="h-4 w-4" />} label="Availability" />
              <MenuRow href="/settings"     icon={<Settings className="h-4 w-4" />}     label="Settings" />
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}

function MenuRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={href} className="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}
