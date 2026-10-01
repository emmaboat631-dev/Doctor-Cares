import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({ padding = 'md', interactive, className, ...rest }: CardProps) {
  const pad = { none: 'p-0', sm: 'p-3', md: 'p-4', lg: 'p-5' }[padding];
  return (
    <div
      className={cn(
        'card-surface rounded-2xl shadow-card',
        pad,
        interactive && 'transition hover:shadow-pop active:scale-[0.995] cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
}
