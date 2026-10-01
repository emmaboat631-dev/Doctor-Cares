import { useState, type FormEvent } from 'react';
import { X, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { useAsync } from '@/hooks/useAsync';
import { listDoctors } from '@/lib/api/doctors';
import { createReferral } from '@/lib/api/referrals';
import { cn } from '@/lib/cn';

/**
 * Doctor-side modal to refer a patient to another specialist. Shows a
 * searchable list of verified doctors; the current doctor is filtered out.
 */
export function ReferralModal({
  open, onClose, patientId, patientName, fromDoctorId, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string | null;
  fromDoctorId: string;
  onCreated?: () => void;
}) {
  const [query, setQuery]       = useState('');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [reason, setReason]     = useState('');
  const [notes, setNotes]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | undefined>();

  const doctors = useAsync(() => listDoctors({ limit: 50 }), []);
  const filtered = (doctors.data ?? [])
    .filter((d) => d.id !== fromDoctorId)
    .filter((d) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (d.profile?.full_name ?? '').toLowerCase().includes(q)
        || (d.specialty ?? '').toLowerCase().includes(q)
      );
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetId) return setError('Pick a doctor to refer to.');
    if (reason.trim().length < 2) return setError('Give a short reason.');
    setError(undefined);
    setSubmitting(true);
    try {
      await createReferral({
        patientId, fromDoctorId, toDoctorId: targetId,
        reason: reason.trim(), notes: notes.trim() || null,
      });
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not send referral.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <form onSubmit={submit} className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div>
            <div className="text-sm font-bold">Refer patient</div>
            {patientName && <div className="text-xs text-ink-muted">For {patientName}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Input label="Find a specialist" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or specialty…" />
          <div className="space-y-1.5 max-h-56 overflow-y-auto -mx-5 px-5">
            {doctors.loading && <div className="text-sm text-ink-muted">Loading doctors…</div>}
            {!doctors.loading && filtered.length === 0 && <div className="text-sm text-ink-muted">No matching doctors.</div>}
            {filtered.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setTargetId(d.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition',
                  targetId === d.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/15'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800',
                )}
              >
                <Avatar name={d.profile?.full_name} src={d.profile?.avatar_url ?? undefined} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{d.profile?.full_name ?? 'Doctor'}</div>
                  <div className="truncate text-xs text-ink-muted inline-flex items-center gap-1">
                    <Stethoscope className="h-3 w-3" /> {d.specialty ?? 'General'}
                  </div>
                </div>
                {targetId === d.id && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                )}
              </button>
            ))}
          </div>

          <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Suspected cardiac arrhythmia — needs ECG" />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">
              Notes <span className="font-normal opacity-70">(optional)</span>
            </label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Relevant history, test results, meds tried so far…"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
        </div>

        <footer className="flex gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={submitting} disabled={!targetId}>Send referral</Button>
        </footer>
      </form>
    </div>
  );
}
