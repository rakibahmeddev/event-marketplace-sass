import type { Metadata } from 'next';
import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faDollarSign, faPlus, faReceipt, faTicket } from '@fortawesome/free-solid-svg-icons';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { listOrganizerEvents } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { eventDateLabels } from '@/lib/format/time';
import { listOrganizerOrders } from '@/lib/orders/repository';
import { requireOrganizer } from '@/lib/organizers/context';

export const metadata: Metadata = { title: 'Dashboard' };

/** Overview stats from real orders (detailed reports: Phase 6). */
export default async function OrganizerDashboardPage() {
  const { tenant, organizer } = await requireOrganizer();
  const [events, orders] = await Promise.all([
    listOrganizerEvents(tenant.id, organizer.id),
    listOrganizerOrders(tenant.id, organizer.id, 500),
  ]);
  const paid = orders.filter((o) => o.status === 'paid');
  const now = new Date();
  const upcoming = events
    .filter((e) => e.status === 'published' && e.endAt && e.endAt > now)
    .sort((a, b) => (a.startAt?.getTime() ?? 0) - (b.startAt?.getTime() ?? 0));
  const ticketsSold = paid.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  // Organizer earnings = ticket subtotal; service fees go to the marketplace.
  const revenue = paid.reduce((n, o) => n + o.subtotal, 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={ticketsSold.toLocaleString('en-US')}
          icon={<Icon icon={faTicket} />}
        />
        <StatCard
          label="Ticket revenue"
          value={formatMoney(revenue, tenant.currency)}
          note="before refunds are paid out"
          icon={<Icon icon={faDollarSign} />}
        />
        <StatCard label="Upcoming events" value={upcoming.length} icon={<Icon icon={faCalendar} />} />
        <StatCard label="Orders" value={paid.length} icon={<Icon icon={faReceipt} />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Upcoming events</h2>
            <ButtonLink
              href="/dashboard/events/new"
              size="sm"
              variant="ghost"
              leadingIcon={<Icon icon={faPlus} className="text-xs" />}
            >
              Create
            </ButtonLink>
          </div>
          {upcoming.length === 0 && <p className="text-sm text-slate-600">No upcoming published events.</p>}
          {upcoming.slice(0, 5).map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/events/${e.id}`}
              className="flex flex-col gap-1.5 rounded-lg p-2 hover:bg-mist"
            >
              <div className="flex justify-between gap-3 text-sm">
                <b className="truncate">{e.title}</b>
                <span className="shrink-0 text-slate-600">
                  {e.totalSold.toLocaleString('en-US')} / {e.totalQuantity.toLocaleString('en-US')}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {e.startAt && e.endAt ? eventDateLabels(e.startAt, e.endAt, e.timezone).short : ''}
              </span>
              <ProgressBar value={e.totalSold} max={Math.max(1, e.totalQuantity)} label={`${e.title} sold`} />
            </Link>
          ))}
        </section>
        <section className="flex flex-col gap-3 rounded-card border border-line-soft bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Recent orders</h2>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-primary">
              View all orders
            </Link>
          </div>
          {orders
            .filter((o) => o.status !== 'expired')
            .slice(0, 6)
            .map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 border-t border-line-soft pt-3 text-sm"
              >
                <div className="min-w-0">
                  <b className="block truncate">{o.buyerName || o.buyerEmail}</b>
                  <span className="text-xs text-slate-500">
                    {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <b>{formatMoney(o.total, o.currency)}</b>
                  <OrderStatusBadge status={o.status} />
                </div>
              </div>
            ))}
          {orders.length === 0 && <p className="text-sm text-slate-600">No orders yet.</p>}
        </section>
      </div>
    </>
  );
}
