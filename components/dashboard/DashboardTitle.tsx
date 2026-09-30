'use client';

import { usePathname } from 'next/navigation';
import type { DashboardNavItem } from './types';

/** Top-bar title = the nav item matching the current path (longest match wins). */
export function DashboardTitle({ nav, fallback }: { nav: DashboardNavItem[]; fallback: string }) {
  const pathname = usePathname();
  const match = [...nav]
    .filter((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return <>{match?.label ?? fallback}</>;
}
