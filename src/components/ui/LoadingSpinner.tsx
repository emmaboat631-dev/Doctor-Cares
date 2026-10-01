import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LoadingSpinnerProps {
  size?: number;
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 20, label, className, fullScreen }: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('inline-flex items-center gap-2 text-ink-muted', className)}>
      <Loader2 style={{ width: size, height: size }} className="animate-spin" aria-hidden />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
  if (fullScreen) {
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
        {spinner}
      </div>
    );
  }
  return <span role="status" aria-live="polite">{spinner}</span>;
}
