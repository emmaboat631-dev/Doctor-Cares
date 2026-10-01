import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Heart, MapPin, MessageSquare, Star, Video } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useAsync } from '@/hooks/useAsync';
import { getDoctor } from '@/lib/api/doctors';
import { openConversationWith } from '@/lib/api/chat';
import { listDoctorReviews, type Review } from '@/lib/api/reviews';
import { fmtDate, fmtMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'about' | 'reviews' | 'location';

export function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const doctor = useAsync(() => (id ? getDoctor(id) : Promise.resolve(null)), [id]);
  const [tab, setTab] = useState<Tab>('about');
  const [messaging, setMessaging] = useState(false);
  const [msgError, setMsgError] = useState<string | undefined>();
  const [favorited, setFavorited] = useState(false);

  const handleMessage = async () => {
    if (!id) return;
    setMsgError(undefined);
    setMessaging(true);
    try {
      const cid = await openConversationWith(id);
      navigate(`/chat/${cid}`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      setMsgError(
        msg.includes('no doctor-patient relationship')
          ? 'Book an appointment first — then you can message this doctor.'
          : msg || 'Could not open the conversation.',
      );
    } finally {
      setMessaging(false);
    }
  };

  return (
    <>
      {/* Custom appbar — floating, no background so hero can bleed under */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800 safe-top">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted dark:bg-slate-800 text-ink"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold flex-1">Doctor profile</h1>
          <button
            type="button"
            onClick={() => setFavorited((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-muted dark:bg-slate-800 text-rose-500"
            aria-label={favorited ? 'Remove favorite' : 'Add to favorites'}
          >
            <Heart className={cn('h-4 w-4', favorited && 'fill-current')} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl pb-32">
        {doctor.loading ? (
          <LoadingSpinner fullScreen label="Loading profile…" />
        ) : doctor.error ? (
          <ErrorState onRetry={doctor.refetch} />
        ) : !doctor.data ? (
          <EmptyState title="Doctor not found" description="This doctor may have been removed or is not verified." />
        ) : (
          <>
            {/* Hero — brand-50 background bleed, big avatar with white ring */}
            <div className="bg-brand-50 dark:bg-brand-500/10 px-5 pt-6 pb-8 text-center">
              <div className="relative inline-block">
                <Avatar
                  name={doctor.data.profile?.full_name}
                  src={doctor.data.profile?.avatar_url ?? undefined}
                  size="xl"
                  className="!h-24 !w-24 ring-4 ring-white dark:ring-slate-900 shadow-lg"
                />
              </div>
              <h1 className="mt-3 text-xl font-bold">{doctor.data.profile?.full_name ?? 'Doctor'}</h1>
              <div className="mt-1 text-xs text-ink-muted">
                {doctor.data.specialty ?? 'General practitioner'}
                {doctor.data.qualifications ? ` · ${doctor.data.qualifications}` : ''}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {doctor.data.is_verified && (
                  <Badge tone="success"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                )}
                {doctor.data.rating != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" />
                    {doctor.data.rating.toFixed(1)}
                    {doctor.data.rating_count > 0 && <span className="font-medium opacity-70"> ({doctor.data.rating_count})</span>}
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 pt-4 space-y-4">
              {/* Stat tiles */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile num={doctor.data.rating_count || 0} label="PATIENTS" />
                <StatTile
                  num={doctor.data.years_experience ?? 0}
                  suffix={doctor.data.years_experience ? '+' : ''}
                  label="YEARS"
                />
                <StatTile num={doctor.data.rating ?? 0} label="RATING" fixed={1} />
              </div>

              {/* Tabs — pill style, active is filled ink */}
              <div className="flex gap-2">
                {(['about', 'reviews', 'location'] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    aria-pressed={tab === t}
                    className={cn(
                      'rounded-full border px-3 py-2 text-xs font-bold capitalize transition',
                      tab === t
                        ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* About tab */}
              {tab === 'about' && (
                <>
                  <Card>
                    <div className="text-sm font-bold mb-1">About {doctor.data.profile?.full_name?.split(' ')[1] ?? 'the doctor'}</div>
                    <p className="text-xs leading-relaxed text-ink-soft dark:text-slate-300">
                      {doctor.data.bio ?? 'This doctor hasn\'t added a bio yet.'}
                    </p>
                  </Card>

                  <Card>
                    <div className="text-sm font-bold mb-2">Consultation</div>
                    <div className="grid gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Fee</span>
                        <span className="font-bold text-brand-700 dark:text-brand-300">{fmtMoney(doctor.data.consultation_fee)}</span>
                      </div>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-ink-muted">Modes</span>
                        <div className="flex gap-1.5">
                          {doctor.data.modes?.includes('video') && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                              <Video className="h-3 w-3" /> Video
                            </span>
                          )}
                          {doctor.data.modes?.includes('clinic') && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/15 px-2 py-1 text-[11px] font-bold text-brand-700 dark:text-brand-300">
                              <MapPin className="h-3 w-3" /> Clinic
                            </span>
                          )}
                        </div>
                      </div>
                      {doctor.data.languages?.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-ink-muted">Languages</span>
                          <span className="text-sm">{doctor.data.languages.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {tab === 'reviews' && id && <ReviewsList doctorId={id} />}

              {tab === 'location' && (
                <Card>
                  <div className="text-sm font-bold mb-1">Clinic address</div>
                  <p className="text-xs text-ink-soft dark:text-slate-300">
                    {doctor.data.clinic_address ?? 'Address not provided.'}
                  </p>
                </Card>
              )}

            </div>
          </>
        )}
      </div>

      {/* Sticky action bar */}
      {doctor.data && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200/70 dark:border-slate-800 safe-bottom">
          <div className="mx-auto max-w-3xl px-5 py-3 space-y-2">
            {msgError && (
              <Alert tone="error" className="text-xs">
                {msgError}
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                fullWidth
                loading={messaging}
                onClick={handleMessage}
                leftIcon={<MessageSquare className="h-4 w-4" />}
                className="!h-12 !rounded-2xl"
              >
                Message
              </Button>
              <Link
                to={`/doctors/${doctor.data.id}/book`}
                className="inline-flex flex-1 h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 text-sm font-bold text-white hover:bg-brand-600 shadow-lg shadow-brand-500/30 active:scale-[0.98] transition"
              >
                Book appointment
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatTile({ num, label, suffix, fixed }: { num: number; label: string; suffix?: string; fixed?: number }) {
  return (
    <Card padding="sm" className="text-center">
      <div className="text-lg font-bold">{fixed != null ? num.toFixed(fixed) : num}{suffix ?? ''}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">{label}</div>
    </Card>
  );
}

function ReviewsList({ doctorId }: { doctorId: string }) {
  const reviews = useAsync(() => listDoctorReviews(doctorId), [doctorId]);
  if (reviews.loading) return <Card><LoadingSpinner label="Loading reviews…" /></Card>;
  if (reviews.error) return <Card><ErrorState onRetry={reviews.refetch} /></Card>;
  const list = reviews.data ?? [];
  if (list.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No reviews yet"
          description="Be the first to review after your appointment."
        />
      </Card>
    );
  }

  // Distribution: count of 5★, 4★, …, 1★
  const counts = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: list.filter((r) => r.rating === n).length,
  }));
  const total = list.length;
  const avg = list.reduce((s, r) => s + r.rating, 0) / total;

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-start gap-4">
          <div className="text-center shrink-0">
            <div className="text-3xl font-bold tracking-tight">{avg.toFixed(1)}</div>
            <div className="mt-0.5 flex justify-center text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('h-3.5 w-3.5', i < Math.round(avg) ? 'fill-current' : 'opacity-30')} />
              ))}
            </div>
            <div className="mt-0.5 text-[10px] text-ink-muted">{total} review{total === 1 ? '' : 's'}</div>
          </div>
          <div className="flex-1 space-y-1">
            {counts.map((c) => {
              const pct = total ? (c.count / total) * 100 : 0;
              return (
                <div key={c.n} className="flex items-center gap-2">
                  <span className="w-5 text-[10px] font-bold text-ink-muted text-right">{c.n}★</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-[10px] text-ink-muted text-right">{c.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
      {list.map((r) => <ReviewCard key={r.id} r={r} />)}
    </div>
  );
}

function ReviewCard({ r }: { r: Review }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={r.patient?.full_name} src={r.patient?.avatar_url ?? undefined} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{r.patient?.full_name ?? 'Patient'}</div>
          <div className="text-[10px] text-ink-muted">{fmtDate(r.created_at, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <div className="flex items-center gap-0.5 text-amber-500 text-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn('h-3.5 w-3.5', i < r.rating ? 'fill-current' : 'opacity-30')} />
          ))}
        </div>
      </div>
      {r.body && <p className="mt-2 text-xs leading-relaxed text-ink-soft dark:text-slate-300">{r.body}</p>}
    </Card>
  );
}
