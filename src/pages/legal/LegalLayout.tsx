import type { ReactNode } from 'react';

/**
 * Shared chrome for /terms and /privacy — gives both pages identical
 * typography, max width, and "last updated" treatment.
 */
export function LegalLayout({ title, lastUpdated, children }: {
  title: string; lastUpdated: string; children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-4 text-sm leading-relaxed text-ink dark:text-ink-onDark">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <div className="mt-1 text-xs text-ink-muted">Last updated {lastUpdated}</div>
      </header>
      {children}
    </article>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <section className="space-y-2">{children}</section>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-5 text-base font-bold tracking-tight">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-ink-soft dark:text-slate-300">{children}</p>;
}
