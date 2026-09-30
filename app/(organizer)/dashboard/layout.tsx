import Link from 'next/link';
import type { ReactNode } from 'react';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Icon } from '@/components/ui/Icon';
import { requireOrganizer } from '@/lib/organizers/context';
import { organizerNav } from './nav';

export default async function OrganizerLayout({ children }: { children: ReactNode }) {
  const { tenant, organizer } = await requireOrganizer();
  return (
    <DashboardShell
      tenantName={tenant.branding.name}
      accountName={organizer.name}
      accountRole="Organizer"
      title="Dashboard"
      nav={organizerNav}
      actions={
        // Order/attendee search arrives with those pages (Phases 4–6).
        <Link
          href={`/o/${organizer.slug}`}
          className="flex h-[42px] items-center gap-2 rounded-input border-[1.5px] border-line px-3.5 text-sm font-semibold hover:bg-mist focus-ring"
        >
          <Icon icon={faArrowUpRightFromSquare} className="text-xs" />
          View profile
        </Link>
      }
    >
      {children}
    </DashboardShell>
  );
}
