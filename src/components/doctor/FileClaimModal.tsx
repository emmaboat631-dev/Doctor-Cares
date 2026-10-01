import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { createClaim } from '@/lib/api/nhisClaims';
import { getPatientProfile } from '@/lib/api/profile';

export function FileClaimModal({
  open, onClose, appointmentId, patientId, doctorId, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  onCreated?: () => void;
}) {
  const [nhisNumber, setNhisNumber] = useState('');
  const [diagnosis, setDiagnosis]   = useState('');
  const [services, setServices]     = useState('');
  const [amount, setAmount]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | undefined>();

  // Pre-fill the patient's NHIS number from their profile so the doctor
  // doesn't have to ask them for it in the room.
  useEffect(() => {
    if (!open || !patientId) return;
    getPatientProfile(patientId).then((p) => {
      if (p?.nhis_number && !nhisNumber) setNhisNumber(p.nhis_number);
    }).catch(() => {/* fine */});
  }, [open, patientId]);

  const save = async (submit: boolean) => {
    if (!nhisNumber.trim()) return setError('NHIS number is required.');
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return setError('Enter a valid amount.');
    setError(undefined);
    setSubmitting(true);
    try {
      await createClaim({
        appointmentId, patientId, doctorId,
        nhisNumber: nhisNumber.trim(),
        diagnosis: diagnosis.trim() || null,
        services: services.trim() || null,
        amount: amt,
        submit,
      });
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not file claim.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); save(true); }}
        className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
          <div className="text-sm font-bold">File NHIS claim</div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Input label="Patient NHIS number" value={nhisNumber}
            onChange={(e) => setNhisNumber(e.target.value)} placeholder="e.g. 123456789012" required />
          <Input label="Diagnosis" value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Malaria (confirmed by RDT)" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">Services rendered</label>
            <textarea
              value={services} onChange={(e) => setServices(e.target.value)} rows={4}
              placeholder="Consultation, lab tests, prescribed medication…"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <Input label="Amount (GH₵)" type="number" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          {error && <Alert tone="error">{error}</Alert>}
        </div>

        <footer className="flex gap-2 border-t border-slate-200 dark:border-slate-800 px-5 py-3">
          <Button type="button" variant="outline" fullWidth onClick={() => save(false)} loading={submitting}>Save draft</Button>
          <Button type="submit" fullWidth loading={submitting}>Submit</Button>
        </footer>
      </form>
    </div>
  );
}
