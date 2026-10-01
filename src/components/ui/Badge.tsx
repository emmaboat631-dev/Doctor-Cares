import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  children: ReactNode;
}

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200',
  success: 'bg-success-soft text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-warning-soft text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  danger:  'bg-danger-soft text-red-800 dark:bg-red-500/15 dark:text-red-300',
  info:    'bg-info-soft text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
