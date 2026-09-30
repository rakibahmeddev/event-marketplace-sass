import type { Metadata } from 'next';
import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowRight,
  faChartColumn,
  faDollarSign,
  faGear,
  faReceipt,
  faStore,
  faTags,
  faTicket,
} from '@fortawesome/free-solid-svg-icons';
import { Delta } from '@/components/reports/Delta';
import { SalesChart } from '@/components/reports/SalesChart';
import { Icon } from '@/components/ui/Icon';
import { StatCard } from '@/components/ui/StatCard';
import { requireRole } from '@/lib/auth/guards';
import { adminDb } from '@/lib/firebase/admin';
import { formatMoney } from '@/lib/format/money';
import { resolveRange } from '@/lib/reports/days';
import { tenantDaily } from '@/lib/reports/repository';
import { fillDays, netOf, percentChange, sum } from '@/lib/reports/summarize';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Overview' };

async function counts(tenantId: string) {
  const db = adminDb();
  const t = (path: string) => db.collection(`tenants/${tenantId}/${path}`);
  const now = new Date();
  const [pending, approved, published, upcoming, categories] = await Promise.all([
    t('organizers').where('status', '==', 'pending').count().get(),
    t('organizers').where('status', '==', 'approved').count().get(),
    t('events').where('status', '==', 'published').count().get(),
    t('events').where('status', '==', 'published').where('endAt', '>', now).count().get(),
    t('categories').where('active', '==', true).count().get(),
  ]);
  return {
    pending: pending.data().count,
    approved: approved.data().count,
    published: published.data().count,
    upcoming: upcoming.data().count,
    categories: categories.data().count,
  };
}

/** Tenant admin overview: last 30 days of sales, then marketplace counts and shortcuts. */
export default async function AdminOverviewPage() {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const range = resolveRange({ range: '30d' }, new Date(), tenant.timezone);
  const [c, current, previous] = await Promise.all([
    counts(tenant.id),
    tenantDaily(tenant.id, range.from, range.to),
    tenantDaily(tenant.id, range.prevFrom, range.prevTo),
  ]);
  const cur = netOf(sum(current));
  const prev = netOf(sum(previous));
  const money = (v: number) => formatMoney(v, tenant.currency);
  const links = [
    {
      href: '/admin/organizers?status=pending',
      icon: faStore,
      title: 'Review organizers',
      text: c.pending ? `${c.pending} waiting for approval` : 'No pending applications',
    },
    {
      href: '/admin/categories',
      icon: faTags,
      title: 'Categories',
      text: `${c.categories} visible categories`,
    },
    {
      href: '/admin/settings',
      icon: faGear,
      title: 'Settings',
      text: 'Name, logo, colours, footer, commission',
    },
    {
      href: '/events',
      icon: faTicket,
      title: 'View marketplace',
      text: 'See the public site as visitors do',
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard
          label="Net sales"
          value={money(cur.gross)}
          delta={<Delta value={percentChange(cur.gross, prev.gross)} />}
          note="last 30 days"
          icon={<Icon icon={faChartColumn} />}
        />
        <StatCard
          label="Marketplace commission"
          value={money(cur.commission)}
          delta={<Delta value={percentChange(cur.commission, prev.commission)} />}
          note="last 30 days"
          icon={<Icon icon={faDollarSign} />}
        />
        <StatCard
          label="Tickets sold"
          value={cur.tickets.toLocaleString('en-US')}
          delta={<Delta value={percentChange(cur.tickets, prev.tickets)} />}
          note="last 30 days"
          icon={<Icon icon={faTicket} />}
        />
        <StatCard
          label="Orders"
          value={cur.orders.toLocaleString('en-US')}
          note="last 30 days"
          icon={<Icon icon={faReceipt} />}
        />
      </div>
      <section
        aria-labelledby="sales-title"
        className="flex flex-col gap-5 rounded-card border border-line-soft bg-white p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="sales-title" className="font-display text-lg font-bold">
              Gross sales
            </h2>
            <p className="text-[13px] text-slate-500">Last 30 days, including service fees</p>
          </div>
          <Link href="/admin/reports" className="text-sm font-semibold text-primary hover:text-primary-hover">
            Sales reports
          </Link>
        </div>
        <SalesChart
          days={fillDays(current, range.from, range.to).map((d) => ({
            date: d.date,
            amount: d.gross,
            tickets: d.tickets,
          }))}
          currency={tenant.currency}
          caption="Gross sales per day, last 30 days"
        />
      </section>
      <div className="grid grid-cols-2 gap-3 md:gap-5 lg:grid-cols-4">
        <StatCard label="Pending organizers" value={c.pending} icon={<Icon icon={faStore} />} />
        <StatCard label="Approved organizers" value={c.approved} icon={<Icon icon={faStore} />} />
        <StatCard label="Upcoming events" value={c.upcoming} icon={<Icon icon={faCalendar} />} />
        <StatCard
          label="Published events"
          value={c.published}
          note="all time"
          icon={<Icon icon={faTicket} />}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center gap-4 rounded-card border border-line-soft bg-white p-5 transition-shadow hover:shadow-lift focus-ring"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
              <Icon icon={l.icon} />
            </span>
            <div className="flex-1">
              <b className="font-display text-base">{l.title}</b>
              <p className="text-sm text-slate-600">{l.text}</p>
            </div>
            <Icon
              icon={faArrowRight}
              className="text-slate-400 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </>
  );
}
