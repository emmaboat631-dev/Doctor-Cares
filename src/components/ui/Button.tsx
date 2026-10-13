import { forwardRef, useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl select-none ' +
  'touch-manipulation [-webkit-tap-highlight-color:transparent] ' +
  'transition-[background-color,color,box-shadow,transform] duration-150 ease-spring ' +
  'active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900';

const variants: Record<Variant, string> = {
  primary:  'bg-brand-500 text-white hover:bg-brand-600 shadow-sm',
  secondary:'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25',
  ghost:    'bg-transparent text-ink hover:bg-slate-100 dark:text-ink-onDark dark:hover:bg-slate-800',
  outline:  'border border-slate-300 dark:border-slate-700 text-ink dark:text-ink-onDark hover:bg-slate-50 dark:hover:bg-slate-800',
  danger:   'bg-danger text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  // Dev-only accessible-name check. An icon-only button with no label is
  // invisible to screen-reader users. The `import.meta.env.DEV` guard is a
  // Vite compile-time constant, so the whole body is dead-code-eliminated
  // from the production bundle — zero cost in prod.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const hasChildren =
      children !== undefined && children !== null && children !== false && children !== '';
    const extras = rest as Record<string, unknown>;
    const hasLabel =
      Boolean(extras['aria-label']) || Boolean(extras['aria-labelledby']);
    if (!hasChildren && !hasLabel) {
      console.warn(
        '[Button] icon-only button has no accessible name. ' +
        'Pass an `aria-label` or `aria-labelledby` so screen-reader users know what it does.',
      );
    }
    // Mount-only check — if a dev dynamically changes a Button from labelled
    // to icon-only during a session, re-render will not re-warn. Acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
