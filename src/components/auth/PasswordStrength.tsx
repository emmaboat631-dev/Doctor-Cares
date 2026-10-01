import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES, strengthMeta } from '@/lib/password';
import { cn } from '@/lib/cn';

/**
 * Live-feedback panel shown under the password field. Displays a 5-segment
 * strength bar + a rules checklist that ticks green as each rule passes.
 */
export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const meta = strengthMeta(password);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Password strength</span>
          <span className={cn('text-[11px] font-semibold', meta.textColor)}>{meta.label}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i <= meta.score ? meta.color : 'bg-slate-200 dark:bg-slate-700',
              )}
            />
          ))}
        </div>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1">
        {PASSWORD_RULES.map((r) => {
          const passed = r.passes(password);
          return (
            <li
              key={r.key}
              className={cn(
                'flex items-center gap-2 text-xs transition-colors',
                passed ? 'text-success font-medium' : 'text-ink-muted',
              )}
            >
              <span
                className={cn(
                  'grid h-4 w-4 place-items-center rounded-full transition',
                  passed ? 'bg-success text-white' : 'bg-slate-100 dark:bg-slate-800 text-ink-faint',
                )}
              >
                {passed ? <Check className="h-3 w-3 stroke-[3]" /> : <Circle className="h-2 w-2 fill-current opacity-40" />}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
