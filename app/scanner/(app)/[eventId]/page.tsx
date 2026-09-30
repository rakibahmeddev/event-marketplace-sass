import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ScannerApp } from '@/components/scanner/ScannerApp';
import { ScannerShell } from '@/components/scanner/ScannerShell';
import { requireUser } from '@/lib/auth/guards';
import { getScannableEvent } from '@/lib/scanner/events';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Scan tickets' };

/** Design 10 · 03–06. Events this user can't scan look like missing pages. */
export default async function ScanEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const [{ eventId }, user, tenant] = await Promise.all([params, requireUser(), requireTenant()]);
  const found = await getScannableEvent(user, eventId);
  if (!found) notFound();
  const staffLabel = found.staffName || user.name || user.email || 'Staff';
  return (
    <ScannerShell tone="camera">
      <ScannerApp
        authTenantId={tenant.authTenantId}
        tenantId={tenant.id}
        event={{
          id: found.event.id,
          title: found.event.title,
          checkedIn: found.event.checkedIn,
          ticketsIssued: found.event.ticketsIssued,
        }}
        staffLabel={staffLabel}
      />
    </ScannerShell>
  );
}
