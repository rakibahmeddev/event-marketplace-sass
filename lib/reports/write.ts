import 'server-only';

import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { rollupPaths, type SalesCounters } from './rollup';

/**
 * Adds sale / refund counters inside the caller's transaction: tenant day, organizer day and the
 * event's all-time totals (eventStats). Server only — rules deny these paths to browsers.
 */
export function applyRollup(
  db: Firestore,
  tx: Transaction,
  at: { tenantId: string; organizerId: string; eventId: string; day: string },
  inc: Partial<SalesCounters>,
  /** Other eventStats changes in the same write (e.g. ticketsIssued). */
  eventExtra: Record<string, unknown> = {},
) {
  const fields = Object.fromEntries(Object.entries(inc).map(([k, v]) => [k, FieldValue.increment(v ?? 0)]));
  const p = rollupPaths(at.tenantId, at.organizerId, at.day);
  tx.set(db.doc(p.tenantDay), { date: at.day, ...fields }, { merge: true });
  tx.set(db.doc(p.organizerDay), { date: at.day, organizerId: at.organizerId, ...fields }, { merge: true });
  tx.set(
    db.doc(`tenants/${at.tenantId}/eventStats/${at.eventId}`),
    { ...fields, ...eventExtra },
    { merge: true },
  );
}
