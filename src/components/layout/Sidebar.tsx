import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/AuthContext';
import { BrandMark } from '@/components/ui/BrandMark';

export interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface Props {
  items: SidebarItem[];
  title?: string;
}

export function Sidebar({ items, title = 'Doctor Cares' }: Props) {
  const { signOut, profile } = useAuth();
  return (
    <aside
      className={cn(
        'hidden sm:flex sm:flex-col shrink-0',
        'w-64 border-r border-slate-200/70 dark:border-slate-800',
        'bg-white dark:bg-slate-950 min-h-dvh sticky top-0',
      )}
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/70 dark:border-slate-800">
        <BrandMark size="xs" />
        <div className="leading-tight">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-ink-muted capitalize">{profile?.role ?? 'signed in'}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Primary">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-ink-soft dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80',
              )
            }
          >
            <Icon className="h-4.5 w-4.5" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-slate-200/70 dark:border-slate-800">
        <button
          onClick={signOut}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
            'text-ink-soft hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Log out
        </button>
      </div>
    </aside>
  );
}
