import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  /** Small uppercase section label rendered above the group. Optional. */
  title?: string;
  /** Supporting one-line description under the title. Optional. */
  description?: string;
  /** Trailing content aligned to the right of the title row (e.g. link). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Groups a cluster of related rows (typically <MenuRow>) inside a rounded
 * card. Pair with MenuRow — SectionGroup provides the title + card chrome,
 * MenuRow provides the row chrome + its own hairline divider.
 */
export function SectionGroup({ title, description, action, children, className }: Props) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-1.5 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {title && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {title}
              </div>
            )}
            {description && (
              <p className="mt-0.5 text-[11px] text-ink-muted truncate">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div
        className={cn(
          'rounded-2xl border border-slate-200/70 dark:border-slate-800',
          'bg-white dark:bg-slate-900 overflow-hidden',
        )}
      >
        {children}
      </div>
    </section>
  );
}
