import { cn } from '@/lib/cn';

/**
 * Canonical UI appointment status set. Covers the master prompt's six
 * display states (§6 and §13).
 *
 * Note: the Supabase `public.appointment_status` enum uses `rejected` where
 * the master-prompt UI language says "Declined". We accept BOTH keys in the
 * meta map so pages can pass the raw DB value and still get the right
 * label without touching the DB enum.
 */
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'rejected'
  | 'rescheduled';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface StatusMeta {
  label: string;
  tone: Tone;
}

const STATUS_META: Record<AppointmentStatus, StatusMeta> = {
  pending:     { label: 'Pending',     tone: 'warning' },
  confirmed:   { label: 'Confirmed',   tone: 'brand'   },
  completed:   { label: 'Completed',   tone: 'success' },
  cancelled:   { label: 'Cancelled',   tone: 'neutral' },
  declined:    { label: 'Declined',    tone: 'danger'  },
  rejected:    { label: 'Declined',    tone: 'danger'  },
  rescheduled: { label: 'Rescheduled', tone: 'info'    },
};

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200',
  success: 'bg-success-soft text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-warning-soft text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  danger:  'bg-danger-soft text-red-800 dark:bg-red-500/15 dark:text-red-300',
  info:    'bg-info-soft text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
};

interface StatusBadgeProps {
  /** Appointment status. Falls through to a neutral pill with the raw label when the value is unknown. */
  status: AppointmentStatus | string | null | undefined;
  /** Override the human label. Rarely needed; kept for i18n hooks. */
  label?: string;
  className?: string;
}

/**
 * Unified appointment status pill. Used by both patient and doctor
 * surfaces so a "Pending" badge means the same thing visually everywhere
 * (master §32.6). Build on top of the Badge primitive's tokens to keep
 * one visual vocabulary.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const meta = (status && STATUS_META[status as AppointmentStatus]) || null;
  const resolvedTone: Tone = meta?.tone ?? 'neutral';
  const resolvedLabel = label ?? meta?.label ?? (status ? String(status) : 'Unknown');

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[resolvedTone],
        className,
      )}
      aria-label={`Status: ${resolvedLabel}`}
    >
      {resolvedLabel}
    </span>
  );
}
