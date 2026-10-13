import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MedicalDisclaimerProps {
  /** Visual density. `compact` = inline footer row. `card` = standalone bordered box. */
  variant?: 'compact' | 'card';
  /** Override the standard copy. Use sparingly — consistent wording is the point. */
  children?: ReactNode;
  className?: string;
}

/**
 * Shared "Information only — not a substitute for medical advice." pill.
 * Satisfies master §9 safety requirement: this exact copy must appear on
 * every surface that renders drug / clinical content so patients are
 * never shown generated info as a diagnosis or prescription.
 */
export function MedicalDisclaimer({ variant = 'compact', children, className }: MedicalDisclaimerProps) {
  const body = children ?? (
    <>
      <b>Information only — not a substitute for medical advice.</b> Always consult a
      licensed clinician or pharmacist before starting, stopping, or changing any medication.
    </>
  );

  if (variant === 'card') {
    return (
      <div
        role="note"
        className={cn(
          'flex items-start gap-2 rounded-xl border border-warning/40 bg-warning-soft/70 px-3 py-2.5 text-xs',
          'text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30',
          className,
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
        <div className="leading-relaxed">{body}</div>
      </div>
    );
  }

  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 text-[11px] leading-relaxed text-ink-muted',
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{body}</span>
    </p>
  );
}
