import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
  as?: 'div' | 'span';
}

export function Skeleton({ className, as: Tag = 'div' }: SkeletonProps) {
  return (
    <Tag
      className={cn(
        'block rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-skeleton',
        className,
      )}
      aria-hidden
    />
  );
}
