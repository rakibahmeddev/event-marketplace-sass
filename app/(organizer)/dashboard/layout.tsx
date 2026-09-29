import type { ReactNode } from 'react';
import { faArrowUpRightFromSquare, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Icon } from '@/components/ui/Icon';
import { requireRole } from '@/lib/auth/guards';
import { getCurrentTenantBranding } from '@/lib/tenant/current';
import { organizerNav } from './nav';

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole('organizer');
  const { name } = await getCurrentTenantBranding();
  // Organizer name comes from tenants/{t}/organizers/{organizerId} in Phase 3.
  return (
    <DashboardShell
      tenantName={name}
      accountName={user.name ?? user.email ?? 'Organizer'}
      accountRole="Organizer"
      title="Dashboard"
      nav={organizerNav}
      actions={
        <>
          <span className="flex h-[42px] w-[280px] items-center gap-2.5 rounded-full bg-field px-4 text-sm text-slate-500">
            <Icon icon={faMagnifyingGlass} />
            Search orders, attendees…
          </span>
          <span className="flex h-[42px] items-center gap-2 rounded-input border-[1.5px] border-line px-3.5 text-sm font-semibold">
            <Icon icon={faArrowUpRightFromSquare} className="text-xs" />
            View profile
          </span>
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
