import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'error' | 'success' | 'info';

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

const tones: Record<Tone, { wrap: string; icon: ReactNode }> = {
  error: {
    wrap: 'bg-danger-soft/70 text-red-800 border-danger/40 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
    icon: <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />,
  },
  success: {
    wrap: 'bg-success-soft/70 text-emerald-800 border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />,
  },
  info: {
    wrap: 'bg-info-soft/70 text-sky-800 border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
    icon: <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />,
  },
};

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', t.wrap, className)}
    >
      {t.icon}
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold leading-5">{title}</div>}
        {children && <div className={cn('leading-5', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
