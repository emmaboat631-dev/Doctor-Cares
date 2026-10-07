import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { tap } from '@/lib/native/haptics';
import { cn } from '@/lib/cn';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional unread count → red badge on top-right. */
  badge?: number;
  end?: boolean;
}

interface Props {
  items: NavItem[];
}

/**
 * Floating glass-pill bottom nav — dark translucent capsule that hovers above
 * content. Each tab is a stacked icon+label. Active tab gets a brand-blue pill
 * background with white icon; inactive tabs are dimmed white.
 */
/**
 * Routes where the floating nav gets in the way. When inside a chat thread
 * (patient or doctor side) the user is focused on the conversation — the tab
 * bar would just steal thumb space and cover the message composer's send
 * button. Same idea for booking confirmation (a full-screen success moment).
 */
/**
 * The pill nav is only shown on the 5 primary tab routes. Every detail /
 * edit / sub-page auto-hides it so the user gets the full viewport and
 * uses the header's back arrow to return.
 *
 * Primary tabs:
 *   Patient:  / /appointments /chat /drugs /profile
 *   Doctor:   / /appointments /chat /patients /profile
 */
function useHidePillNav(): boolean {
  const loc = useLocation();
  const p = loc.pathname;
  // Exact-match the primary tab roots. Anything with an extra segment
  // (/chat/:id, /profile/edit, /appointments/:id, etc.) is a sub-page.
  const primary = new Set(['/', '/appointments', '/chat', '/drugs', '/profile', '/patients']);
  if (primary.has(p)) return false;
  // Defensive: hide on any auth / public page a layout might render under.
  return true;
}

export function BottomNavigation({ items }: Props) {
  if (useHidePillNav()) return null;
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sm:hidden fixed inset-x-4 z-30 pointer-events-none',
        'bottom-[max(env(safe-area-inset-bottom),1rem)]',
        // Hidden while the on-screen keyboard is up (body.kb-open toggled
        // from src/lib/native/bootstrap.ts via @capacitor/keyboard events).
        // Also hides on plain-web when a text input is focused, as a
        // best-effort fallback for browsers without visualViewport events.
        'transition-opacity duration-150',
        '[body.kb-open_&]:opacity-0 [body.kb-open_&]:pointer-events-none',
      )}
    >
      <ul
        className={cn(
          'pointer-events-auto mx-auto max-w-md',
          'flex items-stretch justify-between gap-1',
          'rounded-[28px] px-2 py-2',
          'bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-2xl',
          'shadow-[0_20px_50px_-15px_rgba(15,23,42,0.5)]',
          'border border-white/10',
        )}
      >
        {items.map((item) => <NavItemBtn key={item.to} item={item} />)}
      </ul>
    </nav>
  );
}

function NavItemBtn({ item }: { item: NavItem }) {
  const { to, label, icon: Icon, badge, end } = item;

  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end={end}
        onClick={() => tap()}
        className={({ isActive }) =>
          cn(
            'group relative flex flex-col items-center justify-center gap-1',
            'rounded-2xl px-2 py-2 transition-all duration-300',
            'text-[10.5px] font-bold tracking-tight leading-none',
            'active:scale-[0.94]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            isActive
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40'
              : 'text-white/70 hover:text-white',
          )
        }
        style={{ transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)' }}
      >
        {({ isActive }) => (
          <>
            <div className="relative">
              <Icon
                aria-hidden
                strokeWidth={isActive ? 2.4 : 2}
                className={cn(
                  'h-6 w-6 transition-transform duration-300',
                  isActive ? 'scale-110' : 'scale-100',
                )}
              />

              {badge != null && badge > 0 && (
                <span
                  aria-label={`${badge} unread`}
                  className={cn(
                    'absolute -top-2 -right-2.5 min-h-[18px] min-w-[18px] px-1',
                    'grid place-items-center rounded-full bg-danger text-white',
                    'text-[9px] font-bold ring-2',
                    isActive ? 'ring-brand-500' : 'ring-slate-900 dark:ring-slate-950',
                  )}
                >
                  <span aria-hidden>{formatBadge(badge)}</span>
                </span>
              )}
            </div>
            <span className="mt-0.5">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

function formatBadge(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${Math.floor(n / 1000)}K`;
}
