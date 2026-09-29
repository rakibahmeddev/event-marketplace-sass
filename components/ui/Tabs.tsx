import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type TabItem = { label: ReactNode; href: string; active?: boolean; icon?: ReactNode };

/** Underline tabs (event page sections, account tabs). Link-based so they work without JS. */
export function Tabs({ items, className, label }: { items: TabItem[]; className?: string; label: string }) {
  return (
    <nav aria-label={label} className={cn('flex gap-1 overflow-x-auto border-b border-line-soft', className)}>
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center gap-2 px-4 py-3.5 text-[15px] whitespace-nowrap transition-colors outline-none focus-visible:bg-primary-50',
            t.active
              ? 'font-bold text-primary shadow-[inset_0_-3px_0_var(--brand-primary)]'
              : 'font-semibold text-slate-600 hover:text-ink',
          )}
        >
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Two-up segmented switch (Log in / Sign up). */
export function SegmentedTabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col rounded-lg bg-field p-1 text-center text-[15px] font-semibold"
    >
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? 'page' : undefined}
          className={cn(
            'rounded-[9px] py-[11px] transition-colors focus-ring',
            t.active ? 'bg-white text-ink shadow-segment' : 'text-slate-600 hover:text-ink',
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
