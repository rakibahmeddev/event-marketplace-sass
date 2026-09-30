import 'server-only';

import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { Tenant } from '@/lib/tenant/schema';
import { orderTotals } from './pricing';
import { RESERVATION_MINUTES, type OrderItem } from './schema';

export class CheckoutError extends Error {}

type Buyer = { uid: string; name: string; email: string };

/**
 * Creates a `pending` order and reserves the tickets in ONE transaction (no overselling):
 * remaining = quantity − sold − reserved must cover every requested item.
 * Prices come from the ticket types, never from the client.
 */
export async function createPendingOrder(
  tenant: Tenant,
  buyer: Buyer,
  eventId: string,
  requested: { ticketTypeId: string; quantity: number }[],
): Promise<{ orderId: string }> {
  const db = adminDb();
  const eventRef = db.doc(`tenants/${tenant.id}/events/${eventId}`);
  const orderRef = db.collection(`tenants/${tenant.id}/orders`).doc();
  const now = new Date();

  await db.runTransaction(async (tx) => {
    const event = await tx.get(eventRef);
    if (!event.exists || event.get('status') !== 'published')
      throw new CheckoutError('This event is not on sale.');
    const startAt = (event.get('startAt') as Timestamp | null)?.toDate();
    const endAt = (event.get('endAt') as Timestamp | null)?.toDate();
    if (!startAt || !endAt || endAt <= now) throw new CheckoutError('This event has ended.');

    const ttRefs = requested.map((r) => eventRef.collection('ticketTypes').doc(r.ticketTypeId));
    const ttSnaps = await Promise.all(ttRefs.map((ref) => tx.get(ref)));
    const items: OrderItem[] = [];
    ttSnaps.forEach((tt, i) => {
      const req = requested[i]!;
      if (!tt.exists) throw new CheckoutError('A ticket type is no longer available.');
      const salesStart = (tt.get('salesStartAt') as Timestamp | null)?.toDate();
      const salesEnd = (tt.get('salesEndAt') as Timestamp | null)?.toDate() ?? startAt;
      if (salesStart && salesStart > now)
        throw new CheckoutError(`Sales for “${tt.get('name')}” haven’t started yet.`);
      if (salesEnd <= now) throw new CheckoutError(`Sales for “${tt.get('name')}” have ended.`);
      const remaining =
        (tt.get('quantity') as number) - (tt.get('sold') as number) - (tt.get('reserved') as number);
      if (remaining < req.quantity) {
        throw new CheckoutError(
          remaining <= 0 ? `“${tt.get('name')}” is sold out.` : `Only ${remaining} “${tt.get('name')}” left.`,
        );
      }
      items.push({
        ticketTypeId: tt.id,
        name: tt.get('name') as string,
        unitPrice: tt.get('price') as number,
        quantity: req.quantity,
      });
    });

    const totals = orderTotals(items, tenant.commissionRate);
    ttSnaps.forEach((tt, i) => tx.update(tt.ref, { reserved: FieldValue.increment(requested[i]!.quantity) }));
    tx.create(orderRef, {
      buyerUid: buyer.uid,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      eventId,
      organizerId: event.get('organizerId'),
      items,
      attendees: [],
      ...totals,
      currency: tenant.currency,
      status: 'pending',
      provider: tenant.paymentConfig.provider,
      paymentRef: null,
      expiresAt: Timestamp.fromMillis(now.getTime() + RESERVATION_MINUTES * 60_000),
      createdAt: FieldValue.serverTimestamp(),
      paidAt: null,
    });
  });
  return { orderId: orderRef.id };
}

/** Releases a pending order's reservation. Idempotent: only acts on `pending`. */
export async function releaseOrder(
  tenantId: string,
  orderId: string,
  status: 'expired' | 'failed',
): Promise<boolean> {
  const db = adminDb();
  const orderRef = db.doc(`tenants/${tenantId}/orders/${orderId}`);
  return db.runTransaction(async (tx) => releaseInTx(tx, tenantId, orderRef, status));
}

async function releaseInTx(
  tx: Transaction,
  tenantId: string,
  orderRef: FirebaseFirestore.DocumentReference,
  status: 'expired' | 'failed',
) {
  const order = await tx.get(orderRef);
  if (!order.exists || order.get('status') !== 'pending') return false;
  const eventId = order.get('eventId') as string;
  for (const item of order.get('items') as OrderItem[]) {
    tx.update(adminDb().doc(`tenants/${tenantId}/events/${eventId}/ticketTypes/${item.ticketTypeId}`), {
      reserved: FieldValue.increment(-item.quantity),
    });
  }
  tx.update(orderRef, { status });
  return true;
}

/**
 * Expires pending orders past their 10-minute hold. Runs every minute from a scheduled Cloud Function,
 * and opportunistically for one event before a new reservation (so the emulator behaves the same).
 */
export async function expireStaleOrders(tenantId: string, eventId?: string): Promise<number> {
  let q = adminDb()
    .collection(`tenants/${tenantId}/orders`)
    .where('status', '==', 'pending')
    .where('expiresAt', '<', Timestamp.now());
  if (eventId) q = q.where('eventId', '==', eventId);
  const snap = await q.limit(50).get();
  let n = 0;
  for (const d of snap.docs) if (await releaseOrder(tenantId, d.id, 'expired')) n++;
  return n;
}

/** A buyer starting a new checkout for the same event gives back their previous unfinished hold. */
export async function releaseBuyerPendingOrders(
  tenantId: string,
  buyerUid: string,
  eventId: string,
): Promise<void> {
  const snap = await adminDb()
    .collection(`tenants/${tenantId}/orders`)
    .where('buyerUid', '==', buyerUid)
    .where('eventId', '==', eventId)
    .where('status', '==', 'pending')
    .limit(10)
    .get();
  for (const d of snap.docs) await releaseOrder(tenantId, d.id, 'expired');
}
