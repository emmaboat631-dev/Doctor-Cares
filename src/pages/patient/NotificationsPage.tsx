import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, MessageSquare, Pill } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api/notifications';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { Notification, NotificationType } from '@/types';
import { useState } from 'react';

const typeIcons: Record<NotificationType, { icon: React.ReactNode; bg: string; fg: string }> = {
  appointment:  { icon: <Calendar className="h-4 w-4" />,       bg: 'bg-success-soft', fg: 'text-emerald-700 dark:text-emerald-300' },
  message:      { icon: <MessageSquare className="h-4 w-4" />,  bg: 'bg-brand-50 dark:bg-brand-500/15', fg: 'text-brand-700 dark:text-brand-200' },
  reminder:     { icon: <Calendar className="h-4 w-4" />,       bg: 'bg-warning-soft', fg: 'text-amber-700 dark:text-amber-300' },
  prescription: { icon: <Pill className="h-4 w-4" />,           bg: 'bg-info-soft',    fg: 'text-sky-700 dark:text-sky-300' },
  system:       { icon: <Bell className="h-4 w-4" />,           bg: 'bg-slate-100 dark:bg-slate-800', fg: 'text-ink-soft dark:text-slate-300' },
};

export function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const notifs = useAsync(
    () => (user ? listNotifications(user.id) : Promise.resolve([])),
    [user?.id],
  );

  const anyUnread = (notifs.data ?? []).some((n) => !n.read_at);

  const handleClick = async (n: Notification) => {
    if (!n.read_at) {
      // fire-and-forget; UI updates on refetch or click-through
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.href) navigate(n.href);
  };

  const handleMarkAll = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(user.id);
      notifs.refetch();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header
        title="Notifications"
        showBack
        right={anyUnread ? (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={busy}
            className="text-xs font-semibold text-brand-600 dark:text-brand-300 disabled:opacity-50 px-2"
          >
            Mark all read
          </button>
        ) : undefined}
      />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-2">
        {notifs.loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
        ) : notifs.error ? (
          <ErrorState onRetry={notifs.refetch} />
        ) : (notifs.data ?? []).length === 0 ? (
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title="You're all caught up"
            description="Notifications about appointments and messages will appear here."
          />
        ) : (
          notifs.data!.map((n) => {
            const style = typeIcons[n.type] ?? typeIcons.system;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition',
                  n.read_at
                    ? 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900'
                    : 'border-brand-200 dark:border-brand-500/30 bg-brand-50 dark:bg-brand-500/10',
                )}
              >
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', style.bg, style.fg)}>
                  {style.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 text-sm font-semibold truncate">{n.title}</div>
                    <span className={cn('text-[10px] font-semibold whitespace-nowrap', n.read_at ? 'text-ink-muted' : 'text-brand-600 dark:text-brand-300')}>
                      {fmtRelative(n.created_at)}
                    </span>
                  </div>
                  {n.body && <div className="mt-0.5 text-xs text-ink-muted line-clamp-2">{n.body}</div>}
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
