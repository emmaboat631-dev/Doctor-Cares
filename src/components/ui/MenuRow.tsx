import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'danger';

interface BaseProps {
  /** Lucide icon or any ReactNode rendered inside the leading badge. */
  icon?: ReactNode;
  /** Row label. */
  label: string;
  /** Optional secondary line under the label. */
  description?: string;
  /**
   * Trailing content. If omitted, a right chevron is shown when the row is
   * navigable; otherwise nothing.
   */
  trailing?: ReactNode;
  /** Hide the auto chevron, e.g. when passing a Switch via `trailing`. */
  hideChevron?: boolean;
  tone?: Tone;
  className?: string;
  disabled?: boolean;
}

interface LinkProps extends BaseProps {
  href: string;
  onClick?: never;
  type?: never;
}
interface ButtonProps extends BaseProps {
  href?: never;
  onClick: () => void;
  /** Button `type` when rendered as a <button>. Defaults to `"button"`. */
  type?: 'button' | 'submit';
}

type Props = LinkProps | ButtonProps;

/**
 * Shared list row used across profile / settings / about pages. Keep the
 * container's `overflow-hidden` on the parent (e.g. SectionGroup) so the
 * last child's divider is clipped — the row itself always paints its own
 * bottom border and uses `last:border-none` for parity when stacked.
 */
export function MenuRow(props: Props) {
  const { icon, label, description, trailing, hideChevron, tone = 'default', className, disabled } = props;

  const toneText = tone === 'danger' ? 'text-danger' : 'text-ink dark:text-ink-onDark';
  const badge = (
    <span
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
        tone === 'danger'
          ? 'bg-danger-soft text-danger dark:bg-red-500/15'
          : 'bg-surface-soft text-ink-soft dark:bg-slate-800 dark:text-slate-300',
      )}
    >
      {icon}
    </span>
  );

  // Row content layout. Shared between the Link / button render paths so
  // visual parity is impossible to drift.
  const body = (
    <>
      {icon && badge}
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium truncate', toneText)}>{label}</span>
        {description && (
          <span className="mt-0.5 block text-[11px] text-ink-muted truncate">{description}</span>
        )}
      </span>
      {trailing != null && (
        <span className="shrink-0 text-xs text-ink-muted truncate max-w-[10rem]">{trailing}</span>
      )}
      {!hideChevron && !trailing && 'href' in props && (
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
      )}
    </>
  );

  const rowClass = cn(
    'flex items-center gap-3 px-4 py-3 min-h-[48px]',
    'border-b border-slate-200/70 dark:border-slate-800 last:border-none',
    'touch-manipulation transition-colors duration-150',
    'hover:bg-slate-50 dark:hover:bg-slate-800/60',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
    disabled && 'opacity-60 pointer-events-none',
    className,
  );

  if ('href' in props && props.href !== undefined) {
    return (
      <Link to={props.href} className={rowClass} aria-disabled={disabled || undefined}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type={('type' in props && props.type) || 'button'}
      onClick={(props as ButtonProps).onClick}
      disabled={disabled}
      className={cn(rowClass, 'w-full text-left bg-transparent')}
    >
      {body}
    </button>
  );
}
