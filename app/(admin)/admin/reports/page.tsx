import type { Metadata } from 'next';
import { faFileCsv } from '@fortawesome/free-solid-svg-icons';
import { Delta } from '@/components/reports/Delta';
import { RangeTabs } from '@/components/reports/RangeTabs';
import { SalesChart } from '@/components/reports/SalesChart';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { StatCard } from '@/components/ui/StatCard';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { requireRole } from '@/lib/auth/guards';
import { formatMoney } from '@/lib/format/money';
import { resolveRange, type RangeKey } from '@/lib/reports/days';
import { netOf, percentChange } from '@/lib/reports/summarize';
import { buildTenantReport } from '@/lib/reports/tenant-report';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Sales reports' };

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
];

const dayFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const fmtDay = (d: string) => dayFmt.format(new Date(`${d}T00:00:00Z`));

type Search = { range?: string; from?: string; to?: string };

/** Tenant admin sales report: totals vs the previous period, daily chart, by organizer, by event. */
export default async function SalesReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const range = resolveRange(await searchParams, new Date(), tenant.timezone);
  const r = await buildTenantReport(tenant, range);
  const cur = netOf(r.totals);
  const prev = netOf(r.previous);
  const money = (c: number) => formatMoney(c, tenant.currency);
  const qs = new URLSearchParams({ range: range.key, from: range.from, to: range.to }).toString();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <RangeTabs
            options={RANGES}
            active={range.key}
            hrefFor={(k) => (k === '30d' ? '/admin/reports' : `/admin/reports?range=${k}`)}
          />
          <form method="get" className="flex flex-wrap items-center gap-2" aria-label="Custom dates">
            <input type="hidden" name="range" value="custom" />
            <label className="sr-only" htmlFor="rep-from">
              From
            </label>
            <div className="w-[170px]">
              <Input id="rep-from" name="from" type="date" defaultValue={range.from} />
            </div>
            <span className="text-sm text-slate-500">to</span>
            <label className="sr-only" htmlFor="rep-to">
              To
            </label>
            <div className="w-[170px]">
              <Input id="rep-to" name="to" type="date" defaultValue={range.to} />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Show
            </Button>
          </form>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/admin/reports?${qs}&kind=daily`}
            download
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <Icon icon={faFileCsv} />
            Daily CSV
          </a>
          <a
            href={`/api/admin/reports?${qs}&kind=organizers`}
            download
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <Icon icon={faFileCsv} />
            Organizers CSV
          </a>
        </div>
      </div>

      <p className="-mt-2 text-sm text-slate-600">
        {fmtDay(range.from)} – {fmtDay(range.to)} · {range.days} days, compared with the {range.days} days
        before. Sales count on the day they were paid; refunds on the day they were refunded.
      </p>

      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard
          label="Net sales"
          value={money(cur.gross)}
          delta={<Delta value={percentChange(cur.gross, prev.gross)} />}
          note={`${money(r.totals.gross)} gross − ${money(r.totals.refunds)} refunds`}
        />
        <StatCard
          label="Marketplace commission"
          value={money(cur.commission)}
          delta={<Delta value={percentChange(cur.commission, prev.commission)} />}
          note="service fees, after refunds"
        />
        <StatCard
          label="Organizer earnings"
          value={money(cur.organizerEarnings)}
          note="ticket sales, after refunds"
        />
        <StatCard
          label="Tickets sold"
          value={cur.tickets.toLocaleString('en-US')}
          delta={<Delta value={percentChange(cur.tickets, prev.tickets)} />}
          note={`${cur.orders.toLocaleString('en-US')} orders`}
        />
      </div>

      <section
        aria-labelledby="daily-title"
        className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-6"
      >
        <div>
          <h2 id="daily-title" className="font-display text-lg font-bold">
            Gross sales per day
          </h2>
          <p className="text-[13px] text-slate-500">Including service fees, before refunds</p>
        </div>
        <SalesChart
          days={r.days.map((d) => ({ date: d.date, amount: d.gross, tickets: d.tickets }))}
          currency={tenant.currency}
          caption={`Gross sales per day, ${fmtDay(range.from)} to ${fmtDay(range.to)}`}
        />
      </section>

      <section aria-labelledby="org-title" className="flex flex-col gap-3">
        <h2 id="org-title" className="font-display text-lg font-bold">
          By organizer
        </h2>
        {r.byOrganizer.length === 0 ? (
          <p className="rounded-card border border-line-soft bg-white p-6 text-sm text-slate-600">
            No sales in this period.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Organizer</TH>
                <TH className="text-right">Orders</TH>
                <TH className="text-right">Tickets</TH>
                <TH className="text-right">Gross</TH>
                <TH className="text-right">Refunds</TH>
                <TH className="text-right">Commission</TH>
                <TH className="text-right">Organizer earnings</TH>
              </tr>
            </THead>
            <TBody>
              {r.byOrganizer.map((o) => {
                const n = netOf(o);
                return (
                  <TR key={o.key}>
                    <TD className="font-semibold">{o.name}</TD>
                    <TD className="text-right">{n.orders}</TD>
                    <TD className="text-right">{n.tickets}</TD>
                    <TD className="text-right whitespace-nowrap">{money(o.gross)}</TD>
                    <TD className="text-right whitespace-nowrap text-slate-600">
                      {o.refunds ? `−${money(o.refunds)}` : '—'}
                    </TD>
                    <TD className="text-right whitespace-nowrap">{money(n.commission)}</TD>
                    <TD className="text-right font-bold whitespace-nowrap">{money(n.organizerEarnings)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>

      <section aria-labelledby="event-title" className="flex flex-col gap-3">
        <div>
          <h2 id="event-title" className="font-display text-lg font-bold">
            Top events
          </h2>
          <p className="text-[13px] text-slate-500">All-time totals, not limited to the dates above</p>
        </div>
        {r.byEvent.length === 0 ? (
          <p className="rounded-card border border-line-soft bg-white p-6 text-sm text-slate-600">
            No sales yet.
          </p>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Event</TH>
                <TH>Organizer</TH>
                <TH className="text-right">Tickets</TH>
                <TH className="text-right">Net sales</TH>
                <TH className="text-right">Commission</TH>
                <TH className="text-right">Checked in</TH>
              </tr>
            </THead>
            <TBody>
              {r.byEvent.map((e) => {
                const n = netOf(e);
                return (
                  <TR key={e.id}>
                    <TD className="max-w-[280px] truncate font-semibold">{e.title}</TD>
                    <TD className="max-w-[180px] truncate text-slate-600">{e.organizer}</TD>
                    <TD className="text-right">{n.tickets}</TD>
                    <TD className="text-right whitespace-nowrap">{money(n.gross)}</TD>
                    <TD className="text-right whitespace-nowrap">{money(n.commission)}</TD>
                    <TD className="text-right whitespace-nowrap">
                      {e.checkedIn}/{e.ticketsIssued}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}
