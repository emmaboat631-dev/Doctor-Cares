import { WifiOff } from 'lucide-react';
import { useOnline } from '@/hooks/useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning text-white px-4 py-1.5 text-xs font-medium"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      You're offline — new requests will wait until you reconnect.
    </div>
  );
}
