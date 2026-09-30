import type { Metadata } from 'next';
import Link from 'next/link';
import { faStore } from '@fortawesome/free-solid-svg-icons';
import { OrganizerActions } from '@/components/admin/OrganizerActions';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { requireRole } from '@/lib/auth/guards';
import { categoryMap } from '@/lib/categories/repository';
import { listOrganizers } from '@/lib/organizers/repository';
import { ORGANIZER_STATUSES } from '@/lib/organizers/schema';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Organizers' };

const tone = { pending: 'warning', approved: 'success', suspended: 'danger' } as const;

export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const requested = (await searchParams).status;
  const status = ORGANIZER_STATUSES.find((s) => s === requested) ?? 'pending';
  const [organizers, cats] = await Promise.all([listOrganizers(tenant.id, status), categoryMap(tenant.id)]);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tenant.timezone, dateStyle: 'medium' });

  return (
    <>
      <Tabs
        label="Organizer status"
        items={ORGANIZER_STATUSES.map((s) => ({
          label: s[0]!.toUpperCase() + s.slice(1),
          href: `/admin/organizers?status=${s}`,
          active: s === status,
        }))}
      />
      {organizers.length === 0 ? (
        <EmptyState icon={<Icon icon={faStore} />} title={`No ${status} organizers`} />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Organizer</TH>
              <TH>Category</TH>
              <TH>City</TH>
              <TH>Applied</TH>
              <TH>Status</TH>
              <TH>
                <span className="sr-only">Actions</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {organizers.map((o) => (
              <TR key={o.id}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={o.name} size="sm" />
                    <div className="flex flex-col">
                      <b>{o.name}</b>
                      {o.status === 'approved' ? (
                        <Link href={`/o/${o.slug}`} className="text-xs text-primary hover:underline">
                          /o/{o.slug}
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-500">/o/{o.slug}</span>
                      )}
                    </div>
                  </div>
                  {o.bio && <p className="mt-2 line-clamp-2 max-w-md text-xs text-slate-600">{o.bio}</p>}
                </TD>
                <TD>{(o.category && cats.get(o.category)?.name) || '—'}</TD>
                <TD>{o.city || '—'}</TD>
                <TD className="whitespace-nowrap">{o.createdAt ? fmt.format(o.createdAt) : '—'}</TD>
                <TD>
                  <Badge tone={tone[o.status]} size="md">
                    {o.status}
                  </Badge>
                </TD>
                <TD className="text-right">
                  <OrganizerActions
                    authTenantId={tenant.authTenantId}
                    organizerId={o.id}
                    name={o.name}
                    status={o.status}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <p className="text-xs text-slate-500">
        Approving gives the applicant organizer access (they’ll be asked to log in again). Every approval and
        suspension is recorded in the audit log.
      </p>
    </>
  );
}
