import type { ReactNode } from 'react';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { DashboardMobileBar } from './DashboardMobileBar';
import { DashboardNav } from './DashboardNav';
import type { DashboardNavItem } from './types';

type Props = {
  tenantName: string;
  /** Organizer or tenant name shown in the account switcher. */
  accountName: string;
  accountRole: string;
  title: string;
  nav: DashboardNavItem[];
  /** Right side of the top bar (search, "View profile"…). */
  actions?: ReactNode;
  /** Bottom of the sidebar (e.g. payout balance — deferred). */
  sidebarFooter?: ReactNode;
  children: ReactNode;
};

/** Shared by the organizer and tenant-admin dashboards (design 09). */
export function DashboardShell({
  tenantName,
  accountName,
  accountRole,
  title,
  nav,
  actions,
  sidebarFooter,
  children,
}: Props) {
  return (
    <div className="min-h-dvh bg-mist lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 overflow-y-auto bg-ink px-3.5 py-5 text-ink-muted lg:flex">
        <Logo name={tenantName} tone="light" className="px-2.5 pt-1.5 pb-6" />
        <div className="mb-3.5 flex items-center gap-2.5 rounded-lg bg-ink-800 p-3">
          <Avatar name={accountName} size="sm" tone="white" />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-sm text-white">{accountName}</b>
            <div className="text-xs">{accountRole}</div>
          </div>
          <Icon icon={faChevronDown} className="text-[11px]" />
        </div>
        <DashboardNav items={nav} />
        {sidebarFooter && <div className="mt-auto">{sidebarFooter}</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileBar title={title} accountName={accountName} items={nav} />
        <header className="hidden h-[72px] items-center gap-4 border-b border-line-soft bg-white px-8 lg:flex">
          <h1 className="flex-1 font-display text-[22px] font-extrabold">{title}</h1>
          {actions}
        </header>
        <main className="flex flex-col gap-6 p-4 md:px-8 md:pt-7 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
