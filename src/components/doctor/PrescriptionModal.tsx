import { useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { createPrescription, type Medication } from '@/lib/api/prescriptions';

/**
 * Doctor-side modal to write a new prescription. Multi-row medication form
 * with name, dosage, frequency, duration, instructions. On submit the row
 * is persisted and the parent refetches so the appointment detail reflects
 * the new prescription immediately.
 */
export function PrescriptionModal({
  open, onClose, patientId, doctorId, appointmentId, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  patientId: string;
  doctorId: string;
  appointmentId?: string | null;
  onCreated?: () => void;
}) {
  const [meds, setMeds] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '', instructions: '' },
  ]);
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | undefined>();

  const update = (i: number, patch: Partial<Medication>) =>
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const addRow = () => setMeds((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const removeRow = (i: number) => setMeds((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = meds
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
        instructions: m.instructions?.trim() || undefined,
      }))
      .filter((m) => m.name);
    if (cleaned.length === 0) return setError('Add at least one medication.');
    setError(undefined);
    setSubmitting(true);
    try {
      await createPrescription({
        patientId, doctorId, appointmentId: appointmentId ?? null,
        medications: cleaned,
        diagnosis: diagnosis.trim() || null,
        notes: notes.trim() || null,
      });
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not save prescription.');
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
          <div className="text-sm font-bold">Write prescription</div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <Input label="Diagnosis (optional)" value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="e.g. Acute bronchitis" />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Medications</span>
              <button type="button" onClick={addRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-300">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {meds.map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">#{i + 1}</span>
                    {meds.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} aria-label="Remove"
                        className="ml-auto grid h-7 w-7 place-items-center rounded-full text-ink-muted hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Input label="Drug name"
                    value={m.name} onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="e.g. Amoxicillin" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Dosage"    value={m.dosage}    onChange={(e) => update(i, { dosage:    e.target.value })} placeholder="500 mg" />
                    <Input label="Frequency" value={m.frequency} onChange={(e) => update(i, { frequency: e.target.value })} placeholder="3× daily" />
                  </div>
                  <Input label="Duration" value={m.duration}
                    onChange={(e) => update(i, { duration: e.target.value })}
                    placeholder="e.g. 7 days" />
                  <Input label="Instructions (optional)" value={m.instructions ?? ''}
                    onChange={(e) => update(i, { instructions: e.target.value })}
                    placeholder="e.g. after meals, finish the course" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">Additional notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Advice, follow-up, warnings…"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {error && <Alert tone="error">{error}</Alert>}
        </div>

        <footer className="flex gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" fullWidth loading={submitting}>Save prescription</Button>
        </footer>
      </form>
    </div>
  );
}
