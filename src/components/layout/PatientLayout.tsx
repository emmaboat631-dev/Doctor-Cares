import { useMemo } from 'react';
import { useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Home, MessageSquare, Pill, User } from 'lucide-react';
import { BottomNavigation, type NavItem } from './BottomNavigation';
import { Sidebar, type SidebarItem } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { InstallPrompt } from './InstallPrompt';
import { PageTransition } from './PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listMyConversations } from '@/lib/api/chat';

export function PatientLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const convs = useAsync(async () => (user ? listMyConversations(user.id) : []), [user?.id]);
  const unreadTotal = useMemo(
    () => (convs.data ?? []).reduce((s, c) => s + (c.unread_count ?? 0), 0),
    [convs.data],
  );

  const items: (NavItem & SidebarItem)[] = useMemo(() => [
    { to: '/',             label: t('nav.home'),         icon: Home,          end: true },
    { to: '/appointments', label: t('nav.appointments'), icon: Calendar },
    { to: '/chat',         label: t('nav.chat'),         icon: MessageSquare, badge: unreadTotal },
    { to: '/drugs',        label: t('nav.drugs'),        icon: Pill },
    { to: '/profile',      label: t('nav.profile'),      icon: User },
  ], [t, unreadTotal]);

  // Show the pill nav ONLY on primary tabs. Every detail / edit / sub-page
  // hides it so the content gets full-screen real estate and the back
  // button in the header is the primary way out. Nav visibility is kept in
  // sync with BottomNavigation.useHidePillNav via the same route list there.
  const inHome        = useMatch('/');
  const inAppts       = useMatch('/appointments');
  const inChat        = useMatch('/chat');
  const inDrugs       = useMatch('/drugs');
  const inProfile     = useMatch('/profile');
  const showNav = !!(inHome || inAppts || inChat || inDrugs || inProfile);
  const mainPadding = showNav ? 'pb-28 sm:pb-6' : 'pb-0 sm:pb-6';

  return (
    <div className="min-h-dvh flex bg-surface-muted dark:bg-slate-950">
      <Sidebar items={items} title="Doctor Cares" />
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <main className={`flex-1 ${mainPadding}`}>
          <PageTransition />
        </main>
        <BottomNavigation items={items} />
        <InstallPrompt />
      </div>
    </div>
  );
}
