import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  as?: 'div' | 'span';
  /**
   * When provided, the skeleton announces itself as a polite status region
   * with this label (e.g. "Loading appointments"). When omitted, the
   * skeleton stays `aria-hidden` and is skipped by assistive tech — the
   * current default behaviour.
   */
  label?: string;
}

export function Skeleton({ className, as: Tag = 'div', label }: SkeletonProps) {
  return (
    <Tag
      className={cn(
        'block rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-skeleton',
        className,
      )}
      {...(label
        ? { role: 'status', 'aria-live': 'polite', 'aria-label': label }
        : { 'aria-hidden': true })}
    />
  );
}
