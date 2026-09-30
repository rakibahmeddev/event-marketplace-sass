import type { Metadata } from 'next';
import Link from 'next/link';
import { faReceipt } from '@fortawesome/free-solid-svg-icons';
import { AccountTabs } from '@/components/account/AccountTabs';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { requireUser } from '@/lib/auth/guards';
import { getEvent } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { listBuyerOrders } from '@/lib/orders/repository';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Orders' };

export default async function OrdersPage() {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const orders = (await listBuyerOrders(tenant.id, user.uid, 100)).filter((o) => o.status !== 'expired');
  const events = new Map<string, string>();
  for (const o of orders)
    if (!events.has(o.eventId))
      events.set(o.eventId, (await getEvent(tenant.id, o.eventId))?.title ?? 'Event');
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tenant.timezone, dateStyle: 'medium' });
  return (
    <>
      <div className="border-b border-line-soft bg-white">
        <div className="page-container flex flex-col gap-6 pt-8">
          <h1 className="type-h3">Orders</h1>
          <AccountTabs active="orders" />
        </div>
      </div>
      <div className="page-container py-8">
        {orders.length === 0 ? (
          <EmptyState icon={<Icon icon={faReceipt} />} title="No orders yet" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Event</TH>
                <TH>Date</TH>
                <TH>Total</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {orders.map((o) => (
                <TR key={o.id}>
                  <TD className="font-mono">
                    {o.status === 'paid' ? (
                      <Link href={`/orders/${o.id}/confirmation`} className="text-primary hover:underline">
                        {o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    ) : o.status === 'pending' ? (
                      <Link href={`/checkout/${o.id}`} className="text-primary hover:underline">
                        {o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    ) : (
                      o.id.slice(0, 8).toUpperCase()
                    )}
                  </TD>
                  <TD>{events.get(o.eventId)}</TD>
                  <TD className="whitespace-nowrap">{o.createdAt ? fmt.format(o.createdAt) : ''}</TD>
                  <TD className="font-bold">{formatMoney(o.total, o.currency)}</TD>
                  <TD>
                    <OrderStatusBadge status={o.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
