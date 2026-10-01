import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import {
  addAvailability, addBlockedDate, deleteAvailability, deleteBlockedDate,
  getAvailability, getBlockedDates, updateSlotMinutesForAll,
} from '@/lib/api/availability';
import { cn } from '@/lib/cn';
import { fmtDate } from '@/lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DoctorAvailabilityPage() {
  const { user } = useAuth();
  const doctorId = user?.id ?? '';

  const availability = useAsync(async () => (doctorId ? getAvailability(doctorId) : []), [doctorId]);
  const blocked = useAsync(async () => (doctorId ? getBlockedDates(doctorId) : []), [doctorId]);

  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // Add-window form state
  const [newWeekday, setNewWeekday] = useState<number>(1);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('13:00');

  // Add-blocked form state
  const [blockStart, setBlockStart] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [blockEnd, setBlockEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [blockReason, setBlockReason] = useState('');

  const currentSlotMinutes = availability.data?.[0]?.slot_minutes ?? 30;

  const handleAddWindow = async () => {
    if (!doctorId) return;
    if (newEnd <= newStart) return setError('End time must be later than start time.');
    setError(undefined);
    setBusy(true);
    try {
      await addAvailability({
        doctor_id: doctorId,
        weekday: newWeekday,
        start_time: newStart,
        end_time: newEnd,
        slot_minutes: currentSlotMinutes,
      });
      await availability.refetch();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not add window.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteWindow = async (id: string) => {
    setBusy(true);
    try { await deleteAvailability(id); await availability.refetch(); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? 'Could not delete.'); }
    finally { setBusy(false); }
  };

  const handleSlotChange = async (minutes: number) => {
    if (!doctorId) return;
    setBusy(true);
    try { await updateSlotMinutesForAll(doctorId, minutes); await availability.refetch(); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? 'Could not save.'); }
    finally { setBusy(false); }
  };

  const handleAddBlocked = async () => {
    if (!doctorId) return;
    if (blockEnd < blockStart) return setError('End date must be on or after start date.');
    setError(undefined);
    setBusy(true);
    try {
      await addBlockedDate({
        doctor_id: doctorId,
        start_date: blockStart,
        end_date: blockEnd,
        reason: blockReason.trim() || null,
      });
      setBlockReason('');
      await blocked.refetch();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBlocked = async (id: string) => {
    setBusy(true);
    try { await deleteBlockedDate(id); await blocked.refetch(); }
    catch (e: unknown) { setError((e as { message?: string })?.message ?? 'Could not delete.'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Header title="Availability" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {/* Weekly windows */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Weekly schedule</h2>
            <span className="text-xs text-ink-muted">Add multiple windows per day for splits.</span>
          </div>
          {availability.loading ? (
            <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : (availability.data ?? []).length === 0 ? (
            <Card><div className="text-sm text-ink-muted">No windows yet. Add one below to start accepting bookings.</div></Card>
          ) : (
            <div className="space-y-1.5">
              {availability.data!.map((w) => (
                <div key={w.id} className="flex items-center gap-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                  <span className="w-10 text-xs font-bold text-brand-600 dark:text-brand-300">{WEEKDAYS[w.weekday]}</span>
                  <span className="text-sm font-medium">{w.start_time.slice(0, 5)} – {w.end_time.slice(0, 5)}</span>
                  <span className="text-xs text-ink-muted ml-auto">{w.slot_minutes}m slots</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteWindow(w.id)}
                    disabled={busy}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    aria-label="Delete window"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Card className="mt-3">
            <div className="text-xs font-semibold text-ink-muted mb-2">Add a window</div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setNewWeekday(i)}
                  aria-pressed={newWeekday === i}
                  className={cn(
                    'py-1.5 text-xs font-semibold rounded-lg border transition',
                    newWeekday === i
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >{d}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <div className="text-ink-muted mb-1">Start</div>
                <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </label>
              <label className="text-xs">
                <div className="text-ink-muted mb-1">End</div>
                <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </label>
            </div>
            <Button className="mt-3" leftIcon={<Plus className="h-4 w-4" />} loading={busy} onClick={handleAddWindow} fullWidth>
              Add window
            </Button>
          </Card>
        </section>

        {/* Slot length */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Slot length</h2>
            <span className="text-xs text-ink-muted">Applied to all windows.</span>
          </div>
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSlotChange(m)}
                disabled={busy}
                aria-pressed={currentSlotMinutes === m}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                  currentSlotMinutes === m
                    ? 'border-ink bg-ink text-white dark:bg-ink-onDark dark:text-ink dark:border-ink-onDark'
                    : 'border-slate-300 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >{m} min</button>
            ))}
          </div>
        </section>

        {/* Blocked dates */}
        <section>
          <h2 className="mb-2 text-sm font-semibold">Blocked dates</h2>
          {blocked.loading ? (
            <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : (blocked.data ?? []).length === 0 ? (
            <Card><div className="text-sm text-ink-muted">No blocked dates.</div></Card>
          ) : (
            <div className="space-y-1.5">
              {blocked.data!.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{fmtDate(b.start_date)} → {fmtDate(b.end_date)}</div>
                    {b.reason && <div className="text-xs text-ink-muted truncate">{b.reason}</div>}
                  </div>
                  <button type="button" onClick={() => handleDeleteBlocked(b.id)} disabled={busy}
                    className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    aria-label="Delete blocked date"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <Card className="mt-3">
            <div className="text-xs font-semibold text-ink-muted mb-2">Add a blackout</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <div className="text-ink-muted mb-1">From</div>
                <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </label>
              <label className="text-xs">
                <div className="text-ink-muted mb-1">To</div>
                <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </label>
            </div>
            <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason (optional) — e.g. Conference, personal leave"
              className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <Button className="mt-3" leftIcon={<Plus className="h-4 w-4" />} loading={busy} onClick={handleAddBlocked} fullWidth>
              Block these dates
            </Button>
          </Card>
        </section>
      </div>
    </>
  );
}
