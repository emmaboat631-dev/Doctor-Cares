import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getAppointmentForPatient } from '@/lib/api/appointments';
import { createReview, getMyReviewFor } from '@/lib/api/reviews';
import { cn } from '@/lib/cn';

/**
 * Post-visit review flow. Linked from MyAppointmentsPage past-tab cards once
 * an appointment is marked `completed`. If the patient already left a review
 * (reviews.appointment_id is UNIQUE), we show their existing rating in
 * read-only mode instead of letting them double-submit.
 */
export function RateVisitPage() {
  const { id: appointmentId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const appt = useAsync(
    () => (appointmentId ? getAppointmentForPatient(appointmentId) : Promise.resolve(null)),
    [appointmentId],
  );
  const existing = useAsync(
    () => (appointmentId && user ? getMyReviewFor(appointmentId, user.id) : Promise.resolve(null)),
    [appointmentId, user?.id],
  );

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!appointmentId || !user || !appt.data) return;
    if (rating < 1) return setError('Please pick a star rating.');
    if (appt.data.status !== 'completed') {
      return setError('You can only review a completed appointment.');
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await createReview({
        appointmentId,
        doctorId: appt.data.doctor_id,
        patientId: user.id,
        rating,
        body: body.trim() || null,
      });
      navigate(`/doctors/${appt.data.doctor_id}`, { replace: true });
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (appt.loading || existing.loading) {
    return (<><Header title="Rate your visit" showBack /><LoadingSpinner fullScreen /></>);
  }
  if (!appt.data) {
    return (<><Header title="Rate your visit" showBack /><EmptyState title="Appointment not found" /></>);
  }

  // Already reviewed → show read-only
  if (existing.data) {
    return (
      <>
        <Header title="Your review" showBack />
        <div className="mx-auto max-w-xl px-4 py-6 space-y-4">
          <Card>
            <div className="text-center">
              <div className="text-xs text-ink-muted mb-2">You rated</div>
              <div className="flex justify-center gap-1 text-amber-500 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-6 w-6', i < existing.data!.rating ? 'fill-current' : 'opacity-30')} />
                ))}
              </div>
              {existing.data.body && (
                <p className="text-sm text-ink-soft dark:text-slate-300 italic">"{existing.data.body}"</p>
              )}
            </div>
          </Card>
          <Button fullWidth variant="outline" onClick={() => navigate(-1)}>Done</Button>
        </div>
      </>
    );
  }

  // New review form
  return (
    <>
      <Header title="Rate your visit" showBack />
      <form onSubmit={submit} className="mx-auto max-w-xl px-4 py-5 space-y-4" noValidate>
        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={appt.data.doctor?.full_name ?? null} src={appt.data.doctor?.avatar_url ?? undefined} size="md" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">Dr. {appt.data.doctor?.full_name ?? 'Doctor'}</div>
              <div className="text-[11px] text-ink-muted">{new Date(appt.data.scheduled_at).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-bold mb-3 text-center">How was your experience?</div>
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                className="transition-transform active:scale-90 text-amber-500"
              >
                <Star className={cn('h-10 w-10', (hover || rating) >= n ? 'fill-current' : 'opacity-30')} />
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-ink-muted h-4">
            {rating === 1 && 'Poor'}{rating === 2 && 'Fair'}{rating === 3 && 'Good'}
            {rating === 4 && 'Great'}{rating === 5 && 'Excellent'}
          </div>
        </Card>

        <Card>
          <label htmlFor="body" className="mb-1.5 block text-xs font-bold text-ink-soft dark:text-slate-300">
            Share more <span className="font-normal opacity-70">(optional)</span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="What went well? Anything the doctor could improve?"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </Card>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" fullWidth onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" fullWidth loading={submitting} disabled={rating < 1}>
            Submit review
          </Button>
        </div>
      </form>
    </>
  );
}
