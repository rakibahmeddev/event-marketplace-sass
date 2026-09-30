import 'server-only';

import { getEvent } from '@/lib/events/repository';
import { listOrganizers } from '@/lib/organizers/repository';
import type { Tenant } from '@/lib/tenant/schema';
import type { ResolvedRange } from './days';
import { allOrganizerDaily, eventTotals, tenantDaily } from './repository';
import { fillDays, groupTotals, netOf, sum } from './summarize';

/** Everything the admin Sales reports page and its CSV export show for one range. */
export async function buildTenantReport(tenant: Tenant, range: ResolvedRange) {
  const [current, previous, byOrganizerRows, events, organizers] = await Promise.all([
    tenantDaily(tenant.id, range.from, range.to),
    tenantDaily(tenant.id, range.prevFrom, range.prevTo),
    allOrganizerDaily(tenant.id, range.from, range.to),
    eventTotals(tenant.id),
    listOrganizers(tenant.id, undefined, 1000),
  ]);
  const names = new Map(organizers.map((o) => [o.id, o.name]));
  const byOrganizer = groupTotals(byOrganizerRows).map((r) => ({
    ...r,
    name: names.get(r.key) ?? 'Removed organizer',
  }));

  // Events: all-time totals (eventStats), top 50 by net gross.
  const topEvents = [...events.entries()]
    .filter(([, c]) => c.orders > 0)
    .sort(([, a], [, b]) => netOf(b).gross - netOf(a).gross)
    .slice(0, 50);
  const eventDocs = await Promise.all(topEvents.map(([id]) => getEvent(tenant.id, id)));
  const byEvent = topEvents.map(([id, c], i) => ({
    id,
    ...c,
    title: eventDocs[i]?.title ?? 'Deleted event',
    organizer: names.get(eventDocs[i]?.organizerId ?? '') ?? '—',
  }));

  return {
    range,
    totals: sum(current),
    previous: sum(previous),
    days: fillDays(current, range.from, range.to),
    byOrganizer,
    byEvent,
  };
}
