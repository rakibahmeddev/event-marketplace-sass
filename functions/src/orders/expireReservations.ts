import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { db } from '../lib/admin.js';

type OrderItem = { ticketTypeId: string; quantity: number };

/**
 * Releases 10-minute holds that were never paid (CLAUDE.md → Payments). Same logic as
 * releaseOrder() in the web app: pending → expired, reserved −= quantity, in one transaction.
 */
export const expireReservations = onSchedule(
  { schedule: 'every 1 minutes', timeoutSeconds: 120 },
  async () => {
    const stale = await db
      .collectionGroup('orders')
      .where('status', '==', 'pending')
      .where('expiresAt', '<', Timestamp.now())
      .limit(300)
      .get();
    let released = 0;
    for (const doc of stale.docs) {
      const tenantRef = doc.ref.parent.parent;
      if (!tenantRef) continue;
      const done = await db.runTransaction(async (tx) => {
        const order = await tx.get(doc.ref);
        if (order.get('status') !== 'pending') return false;
        const eventId = order.get('eventId') as string;
        for (const item of order.get('items') as OrderItem[]) {
          tx.update(
            tenantRef.collection('events').doc(eventId).collection('ticketTypes').doc(item.ticketTypeId),
            {
              reserved: FieldValue.increment(-item.quantity),
            },
          );
        }
        tx.update(doc.ref, { status: 'expired' });
        return true;
      });
      if (done) released++;
    }
    if (released) console.log(`expired ${released} reservations`);
  },
);
