import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { getPaymentProvider, type ProviderId } from '@/lib/payments';
import type { Tenant } from '@/lib/tenant/schema';
import type { OrderItem } from './schema';

export class RefundError extends Error {}

/**
 * Full refund: provider refund first (idempotency key per order), then one transaction that marks the
 * order refunded, cancels its tickets, gives the seats back and writes the audit log.
 */
export async function refundOrder(
  tenant: Tenant,
  orderId: string,
  actorUid: string,
  allowed: (organizerId: string) => boolean,
) {
  const db = adminDb();
  const orderRef = db.doc(`tenants/${tenant.id}/orders/${orderId}`);
  const order = await orderRef.get();
  if (!order.exists || !allowed(order.get('organizerId') as string))
    throw new RefundError('Order not found.');
  if (order.get('status') !== 'paid') throw new RefundError('Only paid orders can be refunded.');

  let refundRef = 'free';
  if ((order.get('total') as number) > 0) {
    const provider = getPaymentProvider(order.get('provider') as ProviderId);
    ({ refundRef } = await provider.refund({
      paymentRef: order.get('paymentRef') as string,
      amount: order.get('total') as number,
      accountId: tenant.paymentConfig.stripeAccountId,
      idempotencyKey: `refund_${tenant.id}_${orderId}`,
    }));
  }

  const tickets = await db.collection(`tenants/${tenant.id}/tickets`).where('orderId', '==', orderId).get();
  await db.runTransaction(async (tx) => {
    const fresh = await tx.get(orderRef);
    if (fresh.get('status') !== 'paid') return; // refunded concurrently
    const eventId = fresh.get('eventId') as string;
    let seats = 0;
    for (const item of fresh.get('items') as OrderItem[]) {
      seats += item.quantity;
      tx.update(db.doc(`tenants/${tenant.id}/events/${eventId}/ticketTypes/${item.ticketTypeId}`), {
        sold: FieldValue.increment(-item.quantity),
      });
    }
    tx.update(db.doc(`tenants/${tenant.id}/events/${eventId}`), { totalSold: FieldValue.increment(-seats) });
    for (const t of tickets.docs) tx.update(t.ref, { status: 'cancelled' });
    tx.update(orderRef, { status: 'refunded', refundRef, refundedAt: FieldValue.serverTimestamp() });
    tx.create(db.collection(`tenants/${tenant.id}/auditLogs`).doc(), {
      actorUid,
      action: 'refund',
      target: { orderId, amount: String(fresh.get('total')), currency: fresh.get('currency') as string },
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
