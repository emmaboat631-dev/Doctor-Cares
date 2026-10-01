import type { LucideIcon } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';

interface Props {
  title: string;
  headerBack?: boolean;
  icon?: LucideIcon;
  phase: string;
  description?: string;
}

/**
 * Every route in Phase 1 renders through this component so the routing shell,
 * layouts, headers, bottom nav and offline banner are exercised end-to-end
 * before real page content is implemented in Phases 3–8.
 */
export function PagePlaceholder({ title, headerBack, icon: Icon = Sparkles, phase, description }: Props) {
  return (
    <>
      <Header title={title} showBack={headerBack} />
      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-6 mb-3 flex items-center gap-2">
          <Badge tone="brand">{phase}</Badge>
          <span className="text-xs text-ink-muted">Route wired · UI comes in a later phase</span>
        </div>
        <EmptyState
          icon={<Icon className="h-6 w-6" aria-hidden />}
          title={title}
          description={description ?? 'This screen is part of the routing shell. Its real UI lands in the phase noted above.'}
        />
      </div>
    </>
  );
}
