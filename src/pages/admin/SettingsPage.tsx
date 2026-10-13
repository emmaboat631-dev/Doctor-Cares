import { Info, LogOut, Shield, UserCog } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { SectionGroup } from '@/components/ui/SectionGroup';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';

export function AdminSettingsPage() {
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();

  return (
    <>
      <Header title="Admin settings" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-5">
        <Card>
          <div className="text-sm font-semibold mb-2">Signed in as</div>
          <div className="text-sm text-ink-soft dark:text-slate-300">{user?.email}</div>
        </Card>

        <SectionGroup title="Appearance">
          <div className="flex items-center gap-3 p-4">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
              <UserCog className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium">Theme</span>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              {(['light', 'system', 'dark'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold capitalize touch-manipulation transition-colors duration-150',
                    mode === m
                      ? 'bg-white dark:bg-slate-900 text-ink dark:text-ink-onDark shadow-sm'
                      : 'text-ink-muted hover:text-ink dark:hover:text-ink-onDark',
                  )}
                >{m}</button>
              ))}
            </div>
          </div>
        </SectionGroup>

        <SectionGroup title="Platform">
          <InfoRow icon={<Shield className="h-4 w-4" />} label="Role-based access control (RLS)" value="Enforced in Postgres" />
          <InfoRow icon={<Info className="h-4 w-4" />}   label="App version" value="1.0.0" />
        </SectionGroup>

        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-danger touch-manipulation transition-colors duration-150 hover:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </>
  );
}

/**
 * Non-interactive info row — admin rows here are display-only (RLS state,
 * version). Shared <MenuRow> is reserved for navigable/actionable rows.
 */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-ink-muted">{value}</span>
    </div>
  );
}
