/**
 * Rebuilds the sales rollups (salesDaily, organizerSalesDaily and the sales fields of eventStats) from the
 * orders of one or all marketplaces, and eventStats.ticketsIssued / checkedIn from the tickets. Safe to re-run: it replaces the rollups instead of adding to them.
 *
 *   npm run backfill:sales                         (emulators; every tenant)
 *   npm run backfill:sales -- demo                 (one tenant)
 *
 * Against a real project, set FIREBASE_PROJECT_ID and pass --production explicitly (Phase 7 runbook).
 * Run it while no payments or refunds are in flight: it rewrites the counters those transactions increment.
 */
import { pathToFileURL } from 'node:url';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import { dayKey } from '../lib/reports/days.ts';
import { COUNTER_KEYS, refundIncrements, rollupPaths, saleIncrements, ZERO } from '../lib/reports/rollup.ts';
import type { SalesCounters } from '../lib/reports/rollup.ts';

type OrderDoc = {
  status: string;
  organizerId: string;
  eventId: string;
  items: { quantity: number }[];
  subtotal: number;
  fees: number;
  total: number;
  paidAt?: Timestamp | null;
  refundedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};

function bump(map: Map<string, SalesCounters>, key: string, inc: Partial<SalesCounters>) {
  const c = map.get(key) ?? { ...ZERO };
  for (const [k, v] of Object.entries(inc)) c[k as keyof SalesCounters] += v ?? 0;
  map.set(key, c);
}

async function deleteAll(db: Firestore, path: string) {
  for (;;) {
    const snap = await db.collection(path).limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function rebuildSales(
  db: Firestore,
  tenantId: string,
): Promise<{ orders: number; days: number }> {
  const tenant = await db.doc(`tenants/${tenantId}`).get();
  const tz = (tenant.get('timezone') as string | undefined) ?? 'UTC';
  const tenantDays = new Map<string, SalesCounters>();
  const organizerDays = new Map<string, SalesCounters>(); // key: organizerId|day
  const events = new Map<string, SalesCounters>();

  const orders = await db
    .collection(`tenants/${tenantId}/orders`)
    .where('status', 'in', ['paid', 'refunded'])
    .get();
  for (const doc of orders.docs) {
    const o = doc.data() as OrderDoc;
    const paidAt = (o.paidAt ?? o.createdAt)?.toDate();
    if (!paidAt) continue;
    const entries: [Date, Partial<SalesCounters>][] = [[paidAt, saleIncrements(o)]];
    if (o.status === 'refunded') entries.push([o.refundedAt?.toDate() ?? paidAt, refundIncrements(o)]);
    for (const [at, inc] of entries) {
      const day = dayKey(at, tz);
      bump(tenantDays, day, inc);
      bump(organizerDays, `${o.organizerId}|${day}`, inc);
      bump(events, o.eventId, inc);
    }
  }

  await deleteAll(db, `tenants/${tenantId}/salesDaily`);
  await deleteAll(db, `tenants/${tenantId}/organizerSalesDaily`);
  const writes: [string, Record<string, unknown>, boolean][] = [];
  for (const [day, c] of tenantDays)
    writes.push([rollupPaths(tenantId, '', day).tenantDay, { date: day, ...c }, false]);
  for (const [key, c] of organizerDays) {
    const [organizerId, day] = key.split('|') as [string, string];
    writes.push([
      rollupPaths(tenantId, organizerId, day).organizerDay,
      { date: day, organizerId, ...c },
      false,
    ]);
  }
  // Check-in counters from the tickets: issued = not cancelled, checked in = used.
  const checkin = new Map<string, { ticketsIssued: number; checkedIn: number }>();
  const tickets = await db.collection(`tenants/${tenantId}/tickets`).select('eventId', 'status').get();
  for (const t of tickets.docs) {
    const c = checkin.get(t.get('eventId') as string) ?? { ticketsIssued: 0, checkedIn: 0 };
    if (t.get('status') !== 'cancelled') c.ticketsIssued++;
    if (t.get('status') === 'used') c.checkedIn++;
    checkin.set(t.get('eventId') as string, c);
  }
  const stats = await db.collection(`tenants/${tenantId}/eventStats`).get();
  const eventIds = new Set([...stats.docs.map((d) => d.id), ...events.keys(), ...checkin.keys()]);
  for (const id of eventIds) {
    const c = events.get(id) ?? ZERO;
    writes.push([
      `tenants/${tenantId}/eventStats/${id}`,
      {
        ...Object.fromEntries(COUNTER_KEYS.map((k) => [k, c[k]])),
        ...(checkin.get(id) ?? { ticketsIssued: 0, checkedIn: 0 }),
      },
      false,
    ]);
  }
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [path, data, merge] of writes.slice(i, i + 400)) batch.set(db.doc(path), data, { merge });
    await batch.commit();
  }
  return { orders: orders.size, days: tenantDays.size };
}

// CLI
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { initializeApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-ticketing';
  const production = process.argv.includes('--production');
  if (projectId.startsWith('demo-')) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  } else if (!production) {
    throw new Error(`"${projectId}" is not an emulator project. Pass --production to rebuild real data.`);
  }
  initializeApp({ projectId });
  const db = getFirestore();
  const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const ids = only ? [only] : (await db.collection('tenants').get()).docs.map((d) => d.id);
  for (const id of ids) {
    const r = await rebuildSales(db, id);
    console.log(`✓ ${id}: ${r.orders} orders → ${r.days} sales days`);
  }
}
