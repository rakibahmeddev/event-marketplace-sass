import type { Metadata } from 'next';
import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faDollarSign, faPlus, faQrcode, faTicket } from '@fortawesome/free-solid-svg-icons';
import { Delta } from '@/components/reports/Delta';
import { RangeTabs } from '@/components/reports/RangeTabs';
import { SalesChart } from '@/components/reports/SalesChart';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { listOrganizerEvents } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { eventDateLabels } from '@/lib/format/time';
import { listOrganizerOrders } from '@/lib/orders/repository';
import { requireOrganizer } from '@/lib/organizers/context';
import { resolveRange, type RangeKey } from '@/lib/reports/days';
import { eventTotals, organizerDaily } from '@/lib/reports/repository';
import { fillDays, netOf, percentChange, sum } from '@/lib/reports/summarize';

export const metadata: Metadata = { title: 'Dashboard' };

const RANGES: { key: RangeKey; label: string; long: string }[] = [
  { key: '7d', label: '7D', long: 'Last 7 days' },
  { key: '30d', label: '30D', long: 'Last 30 days' },
  { key: '90d', label: '90D', long: 'Last 90 days' },
];

/** Design 09 overview: stats vs the previous period, daily ticket sales, upcoming events, recent orders. */
export default async function OrganizerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { tenant, organizer } = await requireOrganizer();
  const now = new Date();
  const range = resolveRange(
    await searchParams,
    now,
    tenant.timezone,
    RANGES.map((r) => r.key),
  );
  const [events, orders, current, previous] = await Promise.all([
    listOrganizerEvents(tenant.id, organizer.id),
    listOrganizerOrders(tenant.id, organizer.id, 8),
    organizerDaily(tenant.id, organizer.id, range.from, range.to),
    organizerDaily(tenant.id, organizer.id, range.prevFrom, range.prevTo),
  ]);
  const cur = sum(current);
  const prev = sum(previous);
  const days = fillDays(current, range.from, range.to);

  const upcoming = events
    .filter((e) => e.status === 'published' && e.endAt && e.endAt > now)
    .sort((a, b) => (a.startAt?.getTime() ?? 0) - (b.startAt?.getTime() ?? 0));
  const inAWeek = new Date(now.getTime() + 7 * 86_400_000);
  const thisWeek = upcoming.filter((e) => e.startAt && e.startAt <= inAWeek).length;
  const next = upcoming[0];
  const nextStats = next ? (await eventTotals(tenant.id, [next.id])).get(next.id) : undefined;
  const long = RANGES.find((r) => r.key === range.key)?.long ?? '';
  const titles = new Map(events.map((e) => [e.id, e.title]));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard
          label="Tickets sold"
          value={netOf(cur).tickets.toLocaleString('en-US')}
          delta={<Delta value={percentChange(netOf(cur).tickets, netOf(prev).tickets)} />}
          note={`${long.toLowerCase()}, after refunds`}
          icon={<Icon icon={faTicket} />}
        />
        <StatCard
          label="Ticket revenue"
          value={formatMoney(cur.subtotal, tenant.currency)}
          delta={<Delta value={percentChange(cur.subtotal, prev.subtotal)} />}
          note={`net ${formatMoney(netOf(cur).organizerEarnings, tenant.currency)}`}
          icon={<Icon icon={faDollarSign} />}
        />
        <StatCard
          label="Upcoming events"
          value={upcoming.length}
          delta={thisWeek > 0 ? `${thisWeek} this week` : undefined}
          icon={<Icon icon={faCalendar} />}
        />
        <StatCard
          label={next ? 'Next event check-ins' : 'Check-ins'}
          value={nextStats ? `${nextStats.checkedIn}/${nextStats.ticketsIssued}` : '—'}
          note={next?.title}
          icon={<Icon icon={faQrcode} />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="sales-title"
          className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="sales-title" className="font-display text-lg font-bold">
                Ticket sales
              </h2>
              <p className="text-[13px] text-slate-500">
                {long} · {formatMoney(cur.subtotal, tenant.currency)} gross
              </p>
            </div>
            <RangeTabs
              options={RANGES}
              active={range.key}
              hrefFor={(k) => (k === '30d' ? '/dashboard' : `/dashboard?range=${k}`)}
            />
          </div>
          <SalesChart
            days={days.map((d) => ({ date: d.date, amount: d.subtotal, tickets: d.tickets }))}
            currency={tenant.currency}
            caption={`Ticket sales per day, ${long.toLowerCase()}`}
          />
        </section>

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
              <ProgressBar value={e.totalSold} max={Math.max(1, e.totalQuantity)} label={`${e.title} sold`} />
              <span className="text-xs text-slate-500">
                {e.startAt && e.endAt ? eventDateLabels(e.startAt, e.endAt, e.timezone).short : ''}
              </span>
            </Link>
          ))}
        </section>
      </div>

      <section aria-labelledby="orders-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="orders-title" className="font-display text-lg font-bold">
            Recent orders
          </h2>
          <Link
            href="/dashboard/orders"
            className="text-sm font-semibold text-primary hover:text-primary-hover"
          >
            View all orders
          </Link>
        </div>
        {orders.filter((o) => o.status !== 'expired').length === 0 ? (
          <p className="rounded-card border border-line-soft bg-white p-6 text-sm text-slate-600">
            No orders yet.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Event</TH>
                <TH>Tickets</TH>
                <TH>Total</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {orders
                .filter((o) => o.status !== 'expired')
                .slice(0, 6)
                .map((o) => (
                  <TR key={o.id}>
                    <TD className="font-mono whitespace-nowrap">{o.id.slice(0, 8).toUpperCase()}</TD>
                    <TD className="max-w-[200px] truncate">{o.buyerName || o.buyerEmail}</TD>
                    <TD className="max-w-[260px] truncate">{titles.get(o.eventId) ?? 'Event'}</TD>
                    <TD className="whitespace-nowrap">
                      {o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
                    </TD>
                    <TD className="font-bold whitespace-nowrap">{formatMoney(o.total, o.currency)}</TD>
                    <TD>
                      <OrderStatusBadge status={o.status} />
                    </TD>
                  </TR>
                ))}
            </TBody>
          </Table>
        )}
      </section>
    </>
  );
}
