import { Link } from 'react-router-dom';
import { Bell, ChevronRight, Info, Key, LogOut, Moon, Sun } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/cn';

export function SettingsPage() {
  const { signOut, user } = useAuth();
  const { mode, setMode } = useTheme();

  return (
    <>
      <Header title="Settings" showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Section title="Preferences">
          <SegmentedRow
            label="Appearance"
            icon={<Moon className="h-4 w-4" />}
            options={[
              { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
              { value: 'system', label: 'Auto' },
              { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
            ]}
            value={mode}
            onChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
          />
          <MenuRow href="/notifications" icon={<Bell className="h-4 w-4" />} label="Notifications" />
        </Section>

        <Section title="Account">
          <MenuRow href="/forgot-password" icon={<Key className="h-4 w-4" />} label="Change password" hint={user?.email ?? undefined} />
        </Section>

        <Section title="About">
          <MenuRow href="#" icon={<Info className="h-4 w-4" />} label="Terms & privacy" />
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
              <Info className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium">App version</span>
            <span className="text-xs text-ink-muted">1.0.0</span>
          </div>
        </Section>

        <button
          type="button"
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{title}</div>
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function MenuRow({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none hover:bg-slate-50 dark:hover:bg-slate-800/60"
    >
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-ink-muted mr-1 truncate max-w-[8rem]">{hint}</span>}
      <ChevronRight className="h-4 w-4 text-ink-muted" />
    </Link>
  );
}

function SegmentedRow({
  label, icon, options, value, onChange,
}: {
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none">
      <div className="flex items-center gap-3 sm:flex-1">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
          {icon}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 sm:flex sm:w-auto">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold min-w-0',
              value === o.value
                ? 'bg-white dark:bg-slate-900 text-ink dark:text-ink-onDark shadow-sm'
                : 'text-ink-muted hover:text-ink dark:hover:text-ink-onDark',
            )}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
