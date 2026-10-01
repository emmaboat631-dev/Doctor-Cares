import { useMemo } from 'react';
import { useMatch } from 'react-router-dom';
import { CalendarClock, LayoutDashboard, MessageSquare, Users, User } from 'lucide-react';
import { BottomNavigation, type NavItem } from './BottomNavigation';
import { Sidebar, type SidebarItem } from './Sidebar';
import { OfflineBanner } from './OfflineBanner';
import { InstallPrompt } from './InstallPrompt';
import { PageTransition } from './PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { listMyConversations } from '@/lib/api/chat';

const baseItems: (NavItem & SidebarItem)[] = [
  { to: '/', label: 'Dash', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appts', icon: CalendarClock },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/profile', label: 'Profile', icon: User },
];

export function DoctorLayout() {
  const { user } = useAuth();
  const convs = useAsync(async () => (user ? listMyConversations(user.id) : []), [user?.id]);
  const unreadTotal = useMemo(
    () => (convs.data ?? []).reduce((s, c) => s + (c.unread_count ?? 0), 0),
    [convs.data],
  );

  const items = useMemo(
    () => baseItems.map((it) => (it.to === '/chat' ? { ...it, badge: unreadTotal } : it)),
    [unreadTotal],
  );

  // Chat thread pages skip the pill-nav bottom padding — see PatientLayout.
  const inChat = useMatch('/chat/:conversationId');
  const mainPadding = inChat ? 'pb-0 sm:pb-6' : 'pb-28 sm:pb-6';

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
