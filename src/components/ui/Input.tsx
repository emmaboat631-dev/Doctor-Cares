import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-soft dark:text-slate-300">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-white dark:bg-slate-900',
          'border-slate-300 dark:border-slate-700',
          'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20',
          error && 'border-danger focus-within:border-danger focus-within:ring-danger/20',
          'transition',
        )}
      >
        {leftIcon && <span className="pl-3 text-ink-muted">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'w-full bg-transparent px-3 py-3 text-sm text-ink dark:text-ink-onDark',
            'placeholder:text-ink-faint outline-none',
            leftIcon && 'pl-2',
            rightSlot && 'pr-2',
            className,
          )}
          {...rest}
        />
        {rightSlot && <span className="pr-3">{rightSlot}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
});
