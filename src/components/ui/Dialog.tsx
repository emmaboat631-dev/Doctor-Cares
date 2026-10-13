import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogProps {
  /** Whether the dialog is mounted. When false, nothing renders. */
  open: boolean;
  /** Called when the user requests close (backdrop tap, Escape, close button). */
  onClose: () => void;
  /** Accessible label; required for `aria-label` on the panel. */
  ariaLabel: string;
  /** Layout. `sheet` slides from the bottom on mobile and centers on sm+; `center` always centers. */
  variant?: 'sheet' | 'center';
  /** Panel body. */
  children: ReactNode;
  /** Optional header slot. If provided, renders above `children` with its own padding. */
  header?: ReactNode;
  /** Hide the top-right close icon. Default: shown. */
  hideCloseButton?: boolean;
  /** Disable interactive close (for in-flight submissions). */
  busy?: boolean;
  /** Max panel width. Defaults to `max-w-md`. */
  maxWidthClass?: string;
}

/**
 * Shared dialog shell. One owner of:
 * - focus trap + initial focus
 * - aria-modal + aria-labelledby wiring
 * - Esc + backdrop close (unless `busy`)
 * - body scroll lock while open
 * - enter animation (`animate-slide-up`) that honours `prefers-reduced-motion`
 *
 * This primitive deliberately does NOT own content layout — the caller
 * passes a `header` and `children`. Keeps per-dialog visuals (icons,
 * tones, button rows) with the caller.
 *
 * Migration guide: existing overlays can adopt this one at a time without
 * breaking their visual language. See `DeclineReasonModal` for the first
 * example.
 */
export function Dialog({
  open,
  onClose,
  ariaLabel,
  variant = 'sheet',
  children,
  header,
  hideCloseButton,
  busy,
  maxWidthClass = 'max-w-md',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: when the dialog opens, remember the previously-focused
  // element, then move focus into the panel. Restore on close. We also
  // intercept Tab/Shift-Tab to keep focus inside the panel.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (panel) {
      const firstFocusable = panel.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panel) {
        const focusables = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey, true);
      // Restore focus best-effort — the element may have unmounted.
      try { previousFocusRef.current?.focus?.(); } catch { /* ignore */ }
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  const alignmentClass = variant === 'sheet'
    ? 'items-end sm:items-center'
    : 'items-center';

  return (
    <div
      className={cn('fixed inset-0 z-50 flex justify-center', alignmentClass)}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={() => !busy && onClose()}
        tabIndex={-1}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <div
        ref={panelRef}
        className={cn(
          'relative w-full shadow-2xl safe-bottom overflow-hidden',
          'bg-white dark:bg-slate-900',
          variant === 'sheet'
            ? 'rounded-t-3xl sm:rounded-3xl animate-slide-up'
            : 'rounded-3xl animate-slide-up',
          maxWidthClass,
        )}
      >
        {!hideCloseButton && !header && (
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-ink-muted touch-manipulation transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {header}
        {children}
      </div>
    </div>
  );
}
