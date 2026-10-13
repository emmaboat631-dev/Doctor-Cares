import { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/**
 * Prompt the doctor for a reason before declining a pending appointment.
 * Master §12: "After Decline: require optional reason."
 * The reason is passed via `cancel_reason` to `setAppointmentStatus` —
 * the appointments table already stores it (migration 0004).
 */

const PRESET_REASONS = [
  'Schedule conflict',
  'Unavailable at that time',
  'Case outside my specialty',
  'Need more information from patient',
  'Other',
] as const;

type PresetReason = (typeof PRESET_REASONS)[number];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the final reason (or `null` if the doctor skipped the detail field). */
  onSubmit: (reason: string | null) => Promise<void> | void;
  /** True while the parent is submitting; disables the controls. */
  busy?: boolean;
}

export function DeclineReasonModal({ open, onClose, onSubmit, busy }: Props) {
  const [preset, setPreset] = useState<PresetReason>('Schedule conflict');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | undefined>();

  // Reset state whenever the sheet opens so a prior session's text doesn't
  // bleed into the next decline.
  useEffect(() => {
    if (open) {
      setPreset('Schedule conflict');
      setDetail('');
      setError(undefined);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(undefined);
    const trimmed = detail.trim();
    const composed = trimmed ? `${preset} — ${trimmed}` : preset;
    try {
      await onSubmit(composed);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Could not decline. Please try again.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel="Reason for declining"
      busy={busy}
      hideCloseButton
      header={
        <div className="flex items-start gap-3 border-b border-slate-200/70 dark:border-slate-800 px-5 pt-5 pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-danger-soft text-danger dark:bg-red-500/15 dark:text-red-200">
            <XCircle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold">Reason for declining</div>
            <div className="text-xs text-ink-muted">The patient will see this reason.</div>
          </div>
        </div>
      }
    >
      <div className="p-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-label font-semibold uppercase text-ink-muted mb-1">Reason</legend>
          {PRESET_REASONS.map((r) => (
            <label
              key={r}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:bg-brand-500/10"
            >
              <input
                type="radio"
                name="decline-reason"
                value={r}
                checked={preset === r}
                onChange={() => setPreset(r)}
                disabled={busy}
                className="h-4 w-4 accent-brand-500"
              />
              <span>{r}</span>
            </label>
          ))}
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-label font-semibold uppercase text-ink-muted">
            Additional detail <span className="normal-case font-normal opacity-70">(optional)</span>
          </span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={300}
            disabled={busy}
            placeholder="Anything that helps the patient understand or rebook…"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-base sm:text-sm outline-none transition-[border-color,box-shadow] duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="mt-1 text-right text-caption text-ink-muted">{detail.length}/300</div>
        </label>

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" fullWidth disabled={busy} onClick={onClose}>Cancel</Button>
          <Button
            fullWidth
            loading={busy}
            onClick={handleSubmit}
            className="!bg-danger hover:!bg-red-700"
          >
            Decline appointment
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
