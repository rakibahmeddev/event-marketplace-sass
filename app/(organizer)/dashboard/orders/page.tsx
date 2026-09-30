import type { Metadata } from 'next';
import { faReceipt } from '@fortawesome/free-solid-svg-icons';
import { RefundButton } from '@/components/dashboard/RefundButton';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { listOrganizerEvents } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { listOrganizerOrders } from '@/lib/orders/repository';
import { requireOrganizer } from '@/lib/organizers/context';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrganizerOrdersPage() {
  const { tenant, organizer } = await requireOrganizer();
  const [orders, events] = await Promise.all([
    listOrganizerOrders(tenant.id, organizer.id),
    listOrganizerEvents(tenant.id, organizer.id),
  ]);
  const titles = new Map(events.map((e) => [e.id, e.title]));
  const visible = orders.filter((o) => o.status !== 'expired');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tenant.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Icon icon={faReceipt} />}
        title="No orders yet"
        description="Orders appear here as soon as someone buys a ticket."
      />
    );
  }
  return (
    <Table>
      <THead>
        <tr>
          <TH>Order</TH>
          <TH>Customer</TH>
          <TH>Event</TH>
          <TH>Tickets</TH>
          <TH>Total</TH>
          <TH>Status</TH>
          <TH>
            <span className="sr-only">Actions</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {visible.map((o) => (
          <TR key={o.id}>
            <TD className="font-mono whitespace-nowrap">
              {o.id.slice(0, 8).toUpperCase()}
              <div className="font-sans text-xs text-slate-500">
                {o.createdAt ? fmt.format(o.createdAt) : ''}
              </div>
            </TD>
            <TD>
              <b className="block">{o.buyerName || '—'}</b>
              <span className="text-xs text-slate-500">{o.buyerEmail}</span>
            </TD>
            <TD className="max-w-[240px]">{titles.get(o.eventId) ?? 'Event'}</TD>
            <TD className="whitespace-nowrap">
              {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
            </TD>
            <TD className="font-bold whitespace-nowrap">{formatMoney(o.total, o.currency)}</TD>
            <TD>
              <OrderStatusBadge status={o.status} />
            </TD>
            <TD className="text-right">
              {o.status === 'paid' && (
                <RefundButton
                  orderId={o.id}
                  label={`order ${o.id.slice(0, 8).toUpperCase()} (${formatMoney(o.total, o.currency)})`}
                />
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
