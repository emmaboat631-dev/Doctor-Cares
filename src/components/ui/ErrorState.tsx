import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn’t complete that request. Please try again in a moment.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center" role="alert">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-ink dark:text-ink-onDark">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {onRetry && (
        <Button className="mt-5" onClick={onRetry} leftIcon={<RotateCw className="h-4 w-4" />}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
