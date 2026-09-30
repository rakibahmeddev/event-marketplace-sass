import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { Attendee, OrderItem } from './schema';

export type FulfilResult = 'fulfilled' | 'duplicate' | 'already_paid' | 'refund_required' | 'not_found';

/**
 * Webhook "paid" handling, idempotent: the provider event id is recorded in
 * processedWebhookEvents/{provider}_{eventId} inside the same transaction that marks the order paid,
 * creates one ticket per seat, moves reserved → sold and bumps the event's totalSold.
 * A payment that arrives after the hold expired is honoured if stock allows, otherwise refunded.
 */
export async function fulfilOrder(args: {
  tenantId: string;
  orderId: string;
  provider: string;
  providerEventId: string;
  paymentRef: string;
}): Promise<FulfilResult> {
  const db = adminDb();
  const processedRef = db.doc(`processedWebhookEvents/${args.provider}_${args.providerEventId}`);
  const orderRef = db.doc(`tenants/${args.tenantId}/orders/${args.orderId}`);

  return db.runTransaction(async (tx) => {
    const [processed, order] = await Promise.all([tx.get(processedRef), tx.get(orderRef)]);
    if (processed.exists) return 'duplicate';
    const record = (result: FulfilResult) =>
      tx.create(processedRef, {
        tenantId: args.tenantId,
        orderId: args.orderId,
        result,
        processedAt: FieldValue.serverTimestamp(),
      });
    if (!order.exists) {
      record('not_found');
      return 'not_found';
    }
    const status = order.get('status') as string;
    if (status === 'paid' || status === 'refunded') {
      record('already_paid');
      return 'already_paid';
    }

    const eventId = order.get('eventId') as string;
    const items = order.get('items') as OrderItem[];
    const ttRefs = items.map((i) =>
      db.doc(`tenants/${args.tenantId}/events/${eventId}/ticketTypes/${i.ticketTypeId}`),
    );
    const ttSnaps = await Promise.all(ttRefs.map((r) => tx.get(r)));
    const heldByUs = status === 'pending';

    if (!heldByUs) {
      // Late payment after the hold was released: only honour it if the seats are still free.
      const available = ttSnaps.every((tt, i) => {
        const remaining =
          (tt.get('quantity') as number) - (tt.get('sold') as number) - (tt.get('reserved') as number);
        return tt.exists && remaining >= items[i]!.quantity;
      });
      if (!available) {
        tx.update(orderRef, { status: 'failed', paymentRef: args.paymentRef });
        record('refund_required');
        return 'refund_required';
      }
    }

    let seats = 0;
    ttSnaps.forEach((tt, i) => {
      const q = items[i]!.quantity;
      seats += q;
      tx.update(
        tt.ref,
        heldByUs
          ? { sold: FieldValue.increment(q), reserved: FieldValue.increment(-q) }
          : { sold: FieldValue.increment(q) },
      );
    });
    tx.update(db.doc(`tenants/${args.tenantId}/events/${eventId}`), {
      totalSold: FieldValue.increment(seats),
    });
    // Live check-in counter denominator (scanner app).
    tx.set(
      db.doc(`tenants/${args.tenantId}/eventStats/${eventId}`),
      { ticketsIssued: FieldValue.increment(seats) },
      { merge: true },
    );

    const attendees = (order.get('attendees') as Attendee[] | undefined) ?? [];
    const buyer = { name: order.get('buyerName') as string, email: order.get('buyerEmail') as string };
    let seat = 0;
    for (const item of items) {
      for (let k = 0; k < item.quantity; k++) {
        const a = attendees[seat++] ?? buyer;
        tx.create(db.collection(`tenants/${args.tenantId}/tickets`).doc(), {
          orderId: args.orderId,
          eventId,
          ticketTypeId: item.ticketTypeId,
          ticketTypeName: item.name,
          attendeeName: a.name,
          attendeeEmail: a.email,
          status: 'valid',
          checkedInAt: null,
          checkedInBy: null,
        });
      }
    }
    tx.update(orderRef, {
      status: 'paid',
      paymentRef: args.paymentRef,
      paidAt: FieldValue.serverTimestamp(),
    });
    record('fulfilled');
    return 'fulfilled';
  });
}
