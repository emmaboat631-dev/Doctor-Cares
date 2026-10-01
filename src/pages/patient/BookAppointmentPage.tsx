import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getDoctor } from '@/lib/api/doctors';
import { computeSlots, getAvailability, getBlockedDates, getDoctorBookings, nextSevenDays } from '@/lib/api/availability';
import { createAppointment } from '@/lib/api/appointments';
import { cn } from '@/lib/cn';
import { fmtDate, fmtMoney } from '@/lib/format';

export function BookAppointmentPage() {
  const { id: doctorId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const dates = useMemo(() => nextSevenDays(), []);
  const [selectedDate, setSelectedDate] = useState<Date>(() => dates[0]);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const doctor = useAsync(() => (doctorId ? getDoctor(doctorId) : Promise.resolve(null)), [doctorId]);
  const availability = useAsync(() => (doctorId ? getAvailability(doctorId) : Promise.resolve([])), [doctorId]);
  const blocked = useAsync(() => (doctorId ? getBlockedDates(doctorId) : Promise.resolve([])), [doctorId]);
  const bookings = useAsync(
    () => (doctorId ? getDoctorBookings(doctorId, selectedDate) : Promise.resolve([])),
    [doctorId, selectedDate.toDateString()],
  );

  const slots = useMemo(() => {
    if (!availability.data) return [];
    return computeSlots({
      day: selectedDate,
      availability: availability.data,
      blocked: blocked.data ?? [],
      bookings: bookings.data ?? [],
    });
  }, [availability.data, blocked.data, bookings.data, selectedDate]);

  const handleBook = async () => {
    if (!user || !doctorId || !selectedSlotIso) return;
    setError(undefined);
    setSubmitting(true);
    try {
      const appt = await createAppointment({
        patient_id: user.id,
        doctor_id: doctorId,
        scheduled_at: selectedSlotIso,
        mode: doctor.data?.modes?.includes('video') ? 'video' : (doctor.data?.modes?.[0] ?? 'video'),
        reason: reason.trim() || null,
        fee: doctor.data?.consultation_fee ?? null,
      });
      navigate(`/appointments/${appt.id}/confirmed`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Could not book. Try another time.';
      setError(msg.includes('appointments_no_overlap')
        ? 'That time was just taken — please pick another slot.'
        : msg);
      bookings.refetch();
      setSelectedSlotIso(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (doctor.loading || availability.loading) {
    return (<><Header title="Book appointment" showBack /><LoadingSpinner fullScreen label="Loading availability…" /></>);
  }

  return (
    <>
      <Header title="Book appointment" showBack />
      <div className="mx-auto max-w-3xl px-5 py-4 space-y-5 pb-56 sm:pb-40">
        {/* Doctor summary card */}
        {doctor.data && (
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <Avatar name={doctor.data.profile?.full_name} src={doctor.data.profile?.avatar_url ?? undefined} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate">{doctor.data.profile?.full_name}</div>
                <div className="mt-0.5 text-xs text-ink-muted truncate">
                  {doctor.data.specialty ?? '—'} · {fmtMoney(doctor.data.consultation_fee)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Date section */}
        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Select date</h2>
          <div className="grid grid-cols-5 gap-2">
            {dates.slice(0, 5).map((d) => {
              const active = d.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => { setSelectedDate(d); setSelectedSlotIso(null); }}
                  aria-pressed={active}
                  className={cn(
                    'rounded-2xl border py-3 text-center transition-all duration-300',
                    active
                      ? 'bg-brand-500 border-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink-soft dark:text-slate-300 hover:border-slate-400 active:scale-[0.97]',
                  )}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
                >
                  <div className={cn('text-[9px] font-bold uppercase tracking-wider', active ? 'text-white/80' : 'text-ink-muted')}>
                    {d.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className={cn('mt-1 text-base font-bold', active ? 'text-white' : 'text-ink dark:text-ink-onDark')}>
                    {String(d.getDate()).padStart(2, '0')}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Time section */}
        <section>
          <h2 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Available times</h2>
          {bookings.loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : slots.length === 0 ? (
            <EmptyState
              title="No hours this day"
              description={`${fmtDate(selectedDate.toISOString(), { weekday: 'long', month: 'short', day: 'numeric' })} is not on this doctor's schedule.`}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => {
                const active = s.iso === selectedSlotIso;
                return (
                  <button
                    key={s.iso}
                    type="button"
                    disabled={s.taken}
                    onClick={() => setSelectedSlotIso(s.iso)}
                    aria-pressed={active}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-bold transition-all duration-200',
                      active
                        ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/30'
                        : !s.taken
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-ink-soft dark:text-slate-300 hover:border-brand-400 active:scale-[0.97]'
                          : 'bg-surface-muted dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-ink-muted line-through cursor-not-allowed',
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Reason */}
        <section>
          <label htmlFor="reason" className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            Reason for visit <span className="normal-case font-normal opacity-70">(optional)</span>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            placeholder="Briefly describe your symptoms…"
          />
        </section>

        {error && <Alert tone="error">{error}</Alert>}
      </div>

      {/* Sticky booking bar with summary + full-width confirm */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200/70 dark:border-slate-800 safe-bottom">
        <div className="mx-auto max-w-3xl px-5 py-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-50 dark:bg-brand-500/10 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">Summary</div>
              <div className="mt-0.5 text-sm font-bold truncate">
                {selectedSlotIso
                  ? `${fmtDate(selectedSlotIso, { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(selectedSlotIso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                  : 'Pick a date and time'}
              </div>
            </div>
            <div className="shrink-0 text-lg font-bold text-brand-700 dark:text-brand-300">
              {fmtMoney(doctor.data?.consultation_fee)}
            </div>
          </div>
          <button
            type="button"
            disabled={!selectedSlotIso || submitting}
            onClick={handleBook}
            className={cn(
              'inline-flex w-full h-12 items-center justify-center rounded-full text-sm font-bold text-white transition-all',
              selectedSlotIso && !submitting
                ? 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30 active:scale-[0.98]'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed',
            )}
          >
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </>
  );
}
