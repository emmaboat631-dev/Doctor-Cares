import { AlertTriangle } from 'lucide-react';

/**
 * Rendered when Supabase env vars are missing so the app doesn't hard-crash
 * on first boot. Shows the exact env keys that need to be set.
 */
export function ConfigMissingPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" aria-hidden />
          <h1 className="text-base font-semibold">Configuration needed</h1>
        </div>
        <p className="text-sm">
          Doctor Cares needs a Supabase project to run. Copy <code className="rounded bg-amber-100 px-1">.env.example</code> to <code className="rounded bg-amber-100 px-1">.env</code> and set:
        </p>
        <pre className="mt-3 rounded-lg bg-amber-100 p-3 text-xs whitespace-pre-wrap">
{`VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY`}
        </pre>
        <p className="mt-3 text-xs opacity-80">
          The service-role key must never be added here — it belongs on the server only. RLS policies enforce access.
        </p>
      </div>
    </div>
  );
}
