'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';
import type { DashboardNavItem } from './types';

export function DashboardNav({ items, onNavigate }: { items: DashboardNavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex h-11 items-center gap-3 rounded-input px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-100',
              active
                ? 'bg-primary font-semibold text-white'
                : 'font-medium hover:bg-ink-800 hover:text-white',
            )}
          >
            <Icon icon={item.icon} className="w-[18px] text-center" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
