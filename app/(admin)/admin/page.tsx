import type { Metadata } from 'next';
import Link from 'next/link';
import { faCalendar } from '@fortawesome/free-regular-svg-icons';
import { faArrowRight, faGear, faStore, faTags, faTicket } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { StatCard } from '@/components/ui/StatCard';
import { requireRole } from '@/lib/auth/guards';
import { adminDb } from '@/lib/firebase/admin';
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

/** Tenant admin overview. Sales reports arrive with checkout (Phase 4) and reports (Phase 6). */
export default async function AdminOverviewPage() {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  const c = await counts(tenant.id);
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
      <p className="text-xs text-slate-500">
        Sales figures appear here once checkout is live (Phase 4) and in Sales reports (Phase 6).
      </p>
    </>
  );
}
