import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, FileText, Globe, Info, Key, LogOut, Moon, Shield, Sun } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getNotificationPrefs, updateNotificationPrefs, type NotificationPrefs } from '@/lib/api/notificationPrefs';
import { LOCALES, type LocaleCode } from '@/i18n';
import { cn } from '@/lib/cn';

export function SettingsPage() {
  const { signOut, user } = useAuth();
  const { mode, setMode } = useTheme();
  const { t, i18n } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (!user) return;
    getNotificationPrefs(user.id).then(setPrefs).catch(() => {/* fine */});
  }, [user?.id]);

  const changeLang = (code: LocaleCode) => {
    i18n.changeLanguage(code);
  };

  type PrefKey = keyof Omit<NotificationPrefs, 'user_id' | 'updated_at'>;
  const togglePref = async (key: PrefKey) => {
    if (!user || !prefs) return;
    const next = !prefs[key];
    // Optimistic update
    setPrefs({ ...prefs, [key]: next });
    try { await updateNotificationPrefs(user.id, { [key]: next }); }
    catch { if (user) getNotificationPrefs(user.id).then(setPrefs); }
  };

  return (
    <>
      <Header title={t('settings.title')} showBack />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Section title={t('settings.language')}>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-soft dark:bg-slate-800 text-ink-soft dark:text-slate-300">
                <Globe className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium">{t('settings.language')}</div>
                <div className="text-xs text-ink-muted">{t('settings.languageHint')}</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => changeLang(l.code)}
                  aria-pressed={i18n.language.startsWith(l.code)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition border',
                    i18n.language.startsWith(l.code)
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 text-ink-soft dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >
                  <span aria-hidden>{l.flag}</span>
                  <span className="truncate">{l.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title={t('settings.appearance')}>
          <SegmentedRow
            label={t('settings.appearance')}
            icon={<Moon className="h-4 w-4" />}
            options={[
              { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
              { value: 'system', label: 'Auto' },
              { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
            ]}
            value={mode}
            onChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
          />
          <MenuRow href="/notifications" icon={<Bell className="h-4 w-4" />} label={t('settings.notifications')} />
        </Section>

        <Section title={t('settings.notifications')}>
          {prefs ? (
            <>
              <PrefRow label="Appointments"       hint="Booking, confirmed, cancelled"      value={prefs.appointments} onChange={() => togglePref('appointments')} />
              <PrefRow label="Reminders"          hint="24-hour + 1-hour pings"              value={prefs.reminders}    onChange={() => togglePref('reminders')} />
              <PrefRow label="Chat messages"      hint="New messages from doctors or nurses" value={prefs.chat}         onChange={() => togglePref('chat')} />
              <PrefRow label="Referrals"          hint="New referrals and status updates"    value={prefs.referrals}    onChange={() => togglePref('referrals')} />
              <PrefRow label="Health tips"        hint="Broadcasts from the Doctor Cares team" value={prefs.tips}       onChange={() => togglePref('tips')} />
              <PrefRow label="NHIS claims"        hint="When your claim status changes"      value={prefs.claims}       onChange={() => togglePref('claims')} />
              <PrefRow label="Marketing"          hint="New features, surveys, promotions"   value={prefs.marketing}    onChange={() => togglePref('marketing')} />
            </>
          ) : (
            <div className="px-4 py-3 text-xs text-ink-muted">Loading preferences…</div>
          )}
        </Section>

        <Section title="Account">
          <MenuRow href="/forgot-password" icon={<Key className="h-4 w-4" />} label="Change password" hint={user?.email ?? undefined} />
        </Section>

        <Section title={t('settings.about')}>
          <MenuRow href="/terms"   icon={<FileText className="h-4 w-4" />} label="Terms of Service" />
          <MenuRow href="/privacy" icon={<Shield   className="h-4 w-4" />} label="Privacy Policy" />
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
          <LogOut className="h-4 w-4" /> {t('settings.signOut')}
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

function PrefRow({ label, hint, value, onChange }: {
  label: string; hint: string; value: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3 last:border-none">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-[11px] text-ink-muted truncate">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={onChange}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          value ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700',
        )}
      >
        <span className={cn(
          'inline-block h-5 w-5 translate-x-0.5 translate-y-0.5 rounded-full bg-white shadow transition-transform',
          value && 'translate-x-5',
        )} />
      </button>
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
