import 'server-only';

import { categoryMap, listCategories } from '@/lib/categories/repository';
import { dateRange } from '@/lib/format/time';
import { listOrganizers } from '@/lib/organizers/repository';
import type { Tenant } from '@/lib/tenant/schema';
import { listPublishedEvents } from './repository';
import { toEventCard } from './view';

/** Everything the home page needs, from a handful of indexed queries. */
export async function getHomeData(tenant: Tenant) {
  const now = new Date();
  const weekend = dateRange('weekend', now, tenant.timezone);
  const [categories, catMap, upcoming, weekendPage, organizers] = await Promise.all([
    listCategories(tenant.id),
    categoryMap(tenant.id),
    listPublishedEvents(tenant.id, {}, { size: 60 }),
    listPublishedEvents(tenant.id, { from: weekend.from, to: weekend.to }, { size: 8 }),
    listOrganizers(tenant.id, 'approved', 8),
  ]);

  // "Trending": upcoming events with the strongest sales (share of capacity, then absolute).
  const trending = [...upcoming.events]
    .sort(
      (a, b) =>
        b.totalSold / Math.max(1, b.totalQuantity) - a.totalSold / Math.max(1, a.totalQuantity) ||
        b.totalSold - a.totalSold,
    )
    .slice(0, 8);

  const cityCounts = new Map<string, number>();
  const orgCounts = new Map<string, number>();
  for (const e of upcoming.events) {
    if (e.city) cityCounts.set(e.city, (cityCounts.get(e.city) ?? 0) + 1);
    orgCounts.set(e.organizerId, (orgCounts.get(e.organizerId) ?? 0) + 1);
  }
  const cities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, n]) => ({ name, count: `${n} upcoming event${n === 1 ? '' : 's'}` }));

  const featured = organizers
    .map((o) => ({ o, n: orgCounts.get(o.id) ?? 0 }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4)
    .map(({ o, n }) => ({
      href: `/o/${o.slug}`,
      name: o.name,
      category: (o.category && catMap.get(o.category)?.name) || 'Organizer',
      verified: true,
      upcomingLabel: `${n} upcoming`,
    }));

  return {
    categories,
    trending: trending.map((e) => toEventCard(e, catMap)),
    weekend: weekendPage.events.map((e) => toEventCard(e, catMap)),
    weekendLabel: new Intl.DateTimeFormat('en-US', {
      timeZone: tenant.timezone,
      month: 'short',
      day: 'numeric',
    }).formatRange(weekend.from, new Date(weekend.to.getTime() - 1)),
    cities,
    featured,
    totalUpcoming: upcoming.total,
  };
}

/** Cities that currently have upcoming events (for the Location filter). */
export async function listEventCities(tenantId: string): Promise<string[]> {
  const page = await listPublishedEvents(tenantId, {}, { size: 200 });
  return [...new Set(page.events.map((e) => e.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
