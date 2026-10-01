import { Link } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listMyConversations } from '@/lib/api/chat';
import { fmtRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

export function ChatListPage() {
  const { user, role } = useAuth();
  const convs = useAsync(async () => (user ? listMyConversations(user.id) : []), [user?.id]);

  return (
    <>
      <Header title="Messages" />
      <div className="mx-auto max-w-3xl px-4 py-4 space-y-3">
        <div className="rounded-xl border border-info/30 bg-info-soft/60 px-3 py-2 text-xs text-sky-800 dark:text-sky-300 dark:bg-sky-500/10">
          {role === 'patient'
            ? 'Message a doctor from their profile after you\'ve booked at least one appointment.'
            : 'Your patients appear here after you\'ve had at least one appointment with them.'}
        </div>

        {convs.loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
          </div>
        ) : convs.error ? (
          <ErrorState onRetry={convs.refetch} />
        ) : (convs.data ?? []).length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No conversations yet"
            description={
              role === 'patient'
                ? 'Once you\'ve booked with a doctor, you can message them from their profile.'
                : 'Message threads with your patients will appear here.'
            }
            action={role === 'patient' ? (
              <Link to="/doctors" className="inline-flex h-10 items-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600">
                <Search className="h-4 w-4 mr-2" /> Find a doctor
              </Link>
            ) : undefined}
          />
        ) : (
          <div className="space-y-2">
            {convs.data!.map((c) => {
              const isUnread = c.unread_count > 0;
              return (
                <Link
                  key={c.id}
                  to={`/chat/${c.id}`}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border shadow-card px-3 py-3 transition hover:shadow-pop',
                    isUnread
                      ? 'border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10'
                      : 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900',
                  )}
                >
                  <Avatar name={c.counterparty?.full_name} src={c.counterparty?.avatar_url ?? undefined} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {c.counterparty?.role === 'doctor' ? 'Dr. ' : ''}{c.counterparty?.full_name ?? 'User'}
                        </div>
                        {c.last_message && (
                          <div className={cn(
                            'mt-0.5 truncate text-xs',
                            isUnread ? 'text-ink-soft dark:text-slate-200 font-medium' : 'text-ink-muted',
                          )}>
                            {c.last_message}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {c.last_message_at && (
                          <span className={cn(
                            'text-[11px] font-semibold whitespace-nowrap',
                            isUnread ? 'text-brand-600 dark:text-brand-300' : 'text-ink-muted',
                          )}>
                            {fmtRelative(c.last_message_at)}
                          </span>
                        )}
                        {isUnread && (
                          <span className="inline-grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                            {c.unread_count > 9 ? '9+' : c.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
