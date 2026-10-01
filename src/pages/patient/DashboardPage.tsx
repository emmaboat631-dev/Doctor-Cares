import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell, Calendar, CalendarCheck, ChevronRight, Heart, HeartPulse,
  MessageSquare, Pill, Search, Siren, Sparkles, Stethoscope, Thermometer,
  TrendingUp, Video, Wind,
} from 'lucide-react';
import { SosSheet } from '@/components/patient/SosSheet';
import { getPatientProfile } from '@/lib/api/profile';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listDoctors } from '@/lib/api/doctors';
import { listPatientAppointments } from '@/lib/api/appointments';
import { unreadNotificationCount } from '@/lib/api/notifications';
import { METRIC_SPEC, formatMetric, latestMetricsByType, type MetricType } from '@/lib/api/healthMetrics';
import { listPublishedTips } from '@/lib/api/healthTips';
import { fmtDate, fmtMoney, fmtTime, greetingKeyFor } from '@/lib/format';
import { cn } from '@/lib/cn';

export function PatientDashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const userId = user?.id;

  const doctors = useAsync(() => listDoctors({ limit: 5 }), []);
  const appts = useAsync(async () => (userId ? listPatientAppointments(userId) : []), [userId]);
  const unread = useAsync(async () => (userId ? unreadNotificationCount(userId) : 0), [userId]);
  const vitals = useAsync<Awaited<ReturnType<typeof latestMetricsByType>>>(
    async () => (userId ? latestMetricsByType(userId) : {}),
    [userId],
  );
  const patientProfile = useAsync(
    async () => (userId ? getPatientProfile(userId) : null),
    [userId],
  );
  const tips = useAsync(() => listPublishedTips(3), []);
  const [sosOpen, setSosOpen] = useState(false);

  const nextAppt = useMemo(() => {
    if (!appts.data) return null;
    const now = Date.now();
    return appts.data
      .filter((a) => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.scheduled_at).getTime() >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0] ?? null;
  }, [appts.data]);

  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="mx-auto max-w-3xl px-5 pt-4 safe-top">
        <div className="flex items-start gap-3">
          <Avatar name={profile?.full_name} src={profile?.avatar_url ?? undefined} size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-ink-muted">{t(`greeting.${greetingKeyFor()}`)},</div>
            <div className="flex items-center gap-1.5">
              <span className="truncate text-lg font-bold tracking-tight">{firstName}</span>
              <span className="text-lg" aria-hidden>👋</span>
            </div>
          </div>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative grid h-11 w-11 place-items-center rounded-full bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-ink-soft shadow-sm hover:shadow-md transition"
          >
            <Bell className="h-4 w-4" />
            {(unread.data ?? 0) > 0 && (
              <span className="absolute top-1 right-1 grid min-h-[16px] min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {(unread.data ?? 0) > 9 ? '9+' : unread.data}
              </span>
            )}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pt-4 pb-6 space-y-5">
        {/* Search with prominent Go button */}
        <Link
          to="/doctors"
          className="flex items-center gap-3 rounded-full bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 pl-4 pr-1.5 h-12 text-sm text-ink-muted shadow-sm hover:shadow-md transition"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="flex-1">{t('home.searchPlaceholder')}</span>
          <span className="inline-flex h-9 items-center rounded-full bg-brand-500 px-4 text-xs font-bold text-white">
            {t('home.goButton')}
          </span>
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-5 text-white shadow-[0_12px_32px_-8px_rgba(30,94,255,0.45)]">
          <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div aria-hidden className="pointer-events-none absolute right-16 top-24 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/18 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> {t('home.heroTag')}
              </div>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-tight whitespace-pre-line">{t('home.heroTitle')}</h2>
              <p className="mt-1 text-sm opacity-90 max-w-[16rem]">{t('home.heroSubtitle')}</p>
              <Link
                to="/doctors"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white text-brand-700 h-10 px-4 text-sm font-bold shadow-sm hover:bg-brand-50 transition"
              >
                {t('home.heroButton')} <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div aria-hidden className="relative shrink-0 h-24 w-24">
              <img
                src="/brand-illustration.png"
                alt=""
                className="absolute inset-0 h-full w-full object-contain opacity-95 drop-shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Health snapshot — real readings; tap tile to log a new one */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight">{t('home.healthSnapshot')}</h2>
            <Link to="/metrics" className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600 dark:text-brand-300">
              {t('home.logLink')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <VitalTile type="heart_rate"  icon={<Heart       className="h-4 w-4" />} tone="rose"    label={t('home.heart')} reading={vitals.data?.heart_rate} />
            <VitalTile type="temperature" icon={<Thermometer className="h-4 w-4" />} tone="warning" label={t('home.temp')}  reading={vitals.data?.temperature} />
            <VitalTile type="bp"          icon={<Wind        className="h-4 w-4" />} tone="brand"   label={t('home.bp')}    reading={vitals.data?.bp} />
          </div>
        </section>

        {/* Services */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight">{t('home.services')}</h2>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <ServiceTile to="/doctors"            icon={<Stethoscope className="h-5 w-5" />}   label={t('home.findDoctor')} tone="brand" />
            <ServiceTile to="/doctors?role=nurse" icon={<HeartPulse  className="h-5 w-5" />}   label={t('home.findNurse')}  tone="rose" />
            <ServiceTile to="/appointments"       icon={<CalendarCheck className="h-5 w-5" />} label={t('home.myVisits')}   tone="accent" />
            <ServiceTile to="/chat"               icon={<MessageSquare className="h-5 w-5" />} label={t('home.messages')}   tone="violet" />
          </div>
          <div className="grid grid-cols-4 gap-2.5 mt-2.5">
            <ServiceTile to="/drugs"              icon={<Pill className="h-5 w-5" />}          label={t('home.drugInfo')}   tone="brand" />
          </div>
        </section>

        {/* Next appointment */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight">{t('home.upcomingAppointment')}</h2>
            {appts.data && appts.data.length > 0 && (
              <Link to="/appointments" className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600 dark:text-brand-300">
                {t('home.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          {appts.loading ? (
            <Skeleton className="h-24 w-full rounded-2xl" />
          ) : nextAppt ? (
            <Link
              to={`/appointments/${nextAppt.id}`}
              className="block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-card p-4 hover:shadow-pop transition"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar name={nextAppt.doctor?.full_name} src={nextAppt.doctor?.avatar_url ?? undefined} size="lg" />
                  {nextAppt.status === 'confirmed' && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-success text-white text-[10px] ring-2 ring-white dark:ring-slate-900">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{nextAppt.doctor?.full_name ?? 'Doctor'}</div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted">{nextAppt.doctor?.doctor_profile?.specialty ?? '—'}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                      <Calendar className="h-3 w-3" /> {fmtDate(nextAppt.scheduled_at)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                      {fmtTime(nextAppt.scheduled_at)}
                    </span>
                    {nextAppt.mode === 'video' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 dark:bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-700 dark:text-accent-500">
                        <Video className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 px-4 py-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold">{t('home.noUpcoming')}</div>
              <p className="mt-1 text-xs text-ink-muted">{t('home.noUpcomingHint')}</p>
              <Link to="/doctors" className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand-500 px-4 text-xs font-bold text-white hover:bg-brand-600">
                {t('home.findADoctor')}
              </Link>
            </div>
          )}
        </section>

        {/* Top doctors */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[15px] font-bold tracking-tight">{t('home.topRated')}</h2>
            <Link to="/doctors" className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600 dark:text-brand-300">
              {t('home.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {doctors.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
            </div>
          ) : doctors.error ? (
            <ErrorState onRetry={doctors.refetch} />
          ) : doctors.data && doctors.data.length > 0 ? (
            <div className="space-y-2">
              {doctors.data.map((d) => (
                <Link
                  key={d.id}
                  to={`/doctors/${d.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-card px-3 py-2.5 hover:shadow-pop transition"
                >
                  <Avatar name={d.profile?.full_name} src={d.profile?.avatar_url ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{d.profile?.full_name ?? 'Doctor'}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-muted">
                      {d.specialty ?? 'General practitioner'}
                      {d.years_experience ? ` · ${d.years_experience} yr${d.years_experience > 1 ? 's' : ''}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {d.rating != null && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        ⭐ {d.rating.toFixed(1)}
                      </span>
                    )}
                    {d.consultation_fee != null && (
                      <span className="text-[11px] font-bold text-brand-600 dark:text-brand-300">
                        {fmtMoney(d.consultation_fee)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No doctors yet"
              description="Doctors will appear once at least one is verified by the admin."
            />
          )}
        </section>

        {/* Emergency SOS trigger */}
        <section>
          <button
            type="button"
            onClick={() => setSosOpen(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 p-4 text-white shadow-[0_12px_32px_-8px_rgba(220,38,38,0.5)] active:scale-[0.98] transition flex items-center gap-3"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Siren className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-bold">{t('home.sos')}</span>
              <span className="block text-[11px] opacity-90">{t('home.sosHint')}</span>
            </span>
            <ChevronRight className="h-4 w-4 opacity-80" />
          </button>
        </section>

        {/* Health tips */}
        {tips.data && tips.data.length > 0 && (
          <section>
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold tracking-tight">{t('home.healthTips')}</h2>
              <Link to="/tips" className="inline-flex items-center gap-0.5 text-xs font-bold text-brand-600 dark:text-brand-300">
                {t('home.viewAll')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <Link
              to={`/tips/${tips.data[0].id}`}
              className="block rounded-2xl bg-gradient-to-r from-accent-50 to-brand-50 dark:from-accent-500/10 dark:to-brand-500/10 border border-accent-100 dark:border-accent-500/20 p-4 hover:shadow-pop transition"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white dark:bg-slate-900 text-danger shadow-sm">
                  <Heart className="h-6 w-6 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold line-clamp-1">{tips.data[0].title}</div>
                  <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{tips.data[0].body}</p>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white dark:bg-slate-900 text-brand-600 shadow-sm shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </section>
        )}
      </div>

      <SosSheet
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        contactName={patientProfile.data?.emergency_contact_name}
        contactPhone={patientProfile.data?.emergency_contact_phone}
        contactRelation={patientProfile.data?.emergency_contact_relation}
      />
    </div>
  );
}

const toneStyles = {
  brand:   { bg: 'bg-brand-500',   ring: 'bg-brand-50 dark:bg-brand-500/15',   iconTint: 'text-brand-500 dark:text-brand-300' },
  accent:  { bg: 'bg-accent-500',  ring: 'bg-accent-50 dark:bg-accent-500/15', iconTint: 'text-accent-600 dark:text-accent-500' },
  rose:    { bg: 'bg-rose-500',    ring: 'bg-rose-50 dark:bg-rose-500/15',     iconTint: 'text-rose-600 dark:text-rose-400' },
  violet:  { bg: 'bg-violet-500',  ring: 'bg-violet-50 dark:bg-violet-500/15', iconTint: 'text-violet-600 dark:text-violet-400' },
  warning: { bg: 'bg-warning',     ring: 'bg-warning-soft dark:bg-amber-500/15', iconTint: 'text-amber-700 dark:text-amber-400' },
} as const;

function ServiceTile({
  to, icon, label, tone,
}: {
  to: string; icon: React.ReactNode; label: string; tone: keyof typeof toneStyles;
}) {
  const t = toneStyles[tone];
  return (
    <Link
      to={to}
      className="group rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-card p-3 flex flex-col items-center gap-2 hover:shadow-pop active:scale-[0.97] transition"
    >
      <span className={cn('grid h-11 w-11 place-items-center rounded-2xl', t.ring)}>
        <span className={cn('grid h-8 w-8 place-items-center rounded-xl text-white', t.bg)}>
          {icon}
        </span>
      </span>
      <span className="text-[11px] font-bold text-ink dark:text-ink-onDark text-center leading-tight">{label}</span>
    </Link>
  );
}

function VitalTile({
  type, icon, tone, label, reading,
}: {
  type: MetricType;
  icon: React.ReactNode;
  tone: keyof typeof toneStyles;
  label: string;
  reading: { value: number; value2: number | null; unit: string; type: MetricType } | undefined;
}) {
  const t = toneStyles[tone];
  const hasReading = !!reading;
  const spec = METRIC_SPEC[type];
  const status = hasReading ? spec.normal(reading.value, reading.value2) : null;
  const statusPalette = status
    ? status === 'normal'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
      : status === 'high'
        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
        : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
    : '';
  const statusLabel = status ? { low: 'Low', normal: 'Normal', high: 'High' }[status] : '';

  return (
    <Link
      to={`/metrics?type=${type}`}
      className="block rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 p-3 shadow-card hover:shadow-pop active:scale-[0.98] transition"
    >
      <span className={cn('grid h-7 w-7 place-items-center rounded-lg', t.ring, t.iconTint)}>
        {icon}
      </span>
      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        {hasReading ? (
          <>
            <span className="text-lg font-bold">{formatMetric(reading)}</span>
            <span className="text-[10px] text-ink-muted">{reading.unit}</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-ink-muted">—</span>
        )}
      </div>
      <div className={cn(
        'mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold',
        hasReading ? statusPalette : 'bg-slate-100 dark:bg-slate-800 text-ink-muted',
      )}>
        {hasReading ? (<><TrendingUp className="h-2.5 w-2.5" /> {statusLabel}</>) : 'Tap to log'}
      </div>
    </Link>
  );
}
