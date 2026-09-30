import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { toCounters, type DailyRow } from './summarize';
import type { SalesCounters } from './rollup';

const col = (tenantId: string, name: string) => adminDb().collection(`tenants/${tenantId}/${name}`);

/** Marketplace-wide days in [from, to] (inclusive "YYYY-MM-DD"). */
export async function tenantDaily(tenantId: string, from: string, to: string): Promise<DailyRow[]> {
  const snap = await col(tenantId, 'salesDaily').where('date', '>=', from).where('date', '<=', to).get();
  return snap.docs.map((d) => ({ date: d.get('date') as string, ...toCounters(d.data()) }));
}

/** One organizer's days (composite index organizerId + date). */
export async function organizerDaily(
  tenantId: string,
  organizerId: string,
  from: string,
  to: string,
): Promise<DailyRow[]> {
  const snap = await col(tenantId, 'organizerSalesDaily')
    .where('organizerId', '==', organizerId)
    .where('date', '>=', from)
    .where('date', '<=', to)
    .get();
  return snap.docs.map((d) => ({ date: d.get('date') as string, ...toCounters(d.data()) }));
}

/** Every organizer's days in the range, for the "by organizer" table (at most organizers × days docs). */
export async function allOrganizerDaily(
  tenantId: string,
  from: string,
  to: string,
): Promise<(SalesCounters & { key: string })[]> {
  const snap = await col(tenantId, 'organizerSalesDaily')
    .where('date', '>=', from)
    .where('date', '<=', to)
    .limit(20_000)
    .get();
  return snap.docs.map((d) => ({ key: d.get('organizerId') as string, ...toCounters(d.data()) }));
}

/** All-time sales and check-in totals per event (eventStats). */
export async function eventTotals(
  tenantId: string,
  eventIds?: string[],
): Promise<Map<string, SalesCounters & { checkedIn: number; ticketsIssued: number }>> {
  const db = adminDb();
  const snaps = eventIds
    ? eventIds.length
      ? await db.getAll(...eventIds.map((id) => db.doc(`tenants/${tenantId}/eventStats/${id}`)))
      : []
    : (await col(tenantId, 'eventStats').limit(5000).get()).docs;
  return new Map(
    snaps
      .filter((s) => s.exists)
      .map((s) => [
        s.id,
        {
          ...toCounters(s.data()),
          checkedIn: (s.get('checkedIn') as number | undefined) ?? 0,
          ticketsIssued: (s.get('ticketsIssued') as number | undefined) ?? 0,
        },
      ]),
  );
}
