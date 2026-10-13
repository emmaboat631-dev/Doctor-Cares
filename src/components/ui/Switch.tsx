import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps {
  /** Current on/off state. */
  checked: boolean;
  /** Called with the next state when the user toggles. */
  onChange: (next: boolean) => void;
  /** Accessible label. Required. */
  'aria-label'?: string;
  /** Programmatic label id, when the switch sits next to visible text. */
  'aria-labelledby'?: string;
  /** Disable interaction. */
  disabled?: boolean;
  className?: string;
}

/**
 * Shared toggle switch. Matches the existing `role="switch"` pattern in
 * `SettingsPage.PrefRow` so adopting it is a drop-in replacement. The
 * visual (sliding thumb, brand-500 track) is preserved verbatim.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, disabled, className, ...rest },
  ref,
) {
  const label = rest['aria-label'];
  const labelledby = rest['aria-labelledby'];
  if (!label && !labelledby && import.meta.env.DEV) {
    console.warn('[Switch] missing accessible name — pass `aria-label` or `aria-labelledby`.');
  }

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-labelledby={labelledby}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full touch-manipulation',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
        checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 translate-x-0.5 translate-y-0.5 rounded-full bg-white shadow',
          'transition-transform duration-150 ease-spring',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
});
