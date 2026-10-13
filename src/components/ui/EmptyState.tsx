import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Optional id on the <h3>, so a parent can wire aria-labelledby. */
  titleId?: string;
}

export function EmptyState({ icon, title, description, action, className, titleId }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {icon && (
        <div
          aria-hidden
          className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-500/15"
        >
          {icon}
        </div>
      )}
      <h3 id={titleId} className="text-lg font-semibold text-ink dark:text-ink-onDark">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
