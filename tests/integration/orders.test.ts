import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
process.env.FIREBASE_PROJECT_ID = 'demo-ticketing';
process.env.TEST_PAYMENT_WEBHOOK_SECRET ??= 'integration-test-webhook-secret-0123456789';

const { db } = await import('./helpers');
const { Timestamp, FieldValue } = await import('firebase-admin/firestore');
const { createPendingOrder, expireStaleOrders, CheckoutError } = await import('@/lib/orders/reserve');
const { fulfilOrder } = await import('@/lib/orders/fulfil');
const { refundOrder } = await import('@/lib/orders/refund');
const { processWebhook } = await import('@/lib/orders/webhook');
const { buildTestWebhook } = await import('@/lib/payments/test');
const { getTenantById } = await import('@/lib/tenant/repository');

const T = 'demo';
let tenant: NonNullable<Awaited<ReturnType<typeof getTenantById>>>;
const buyer = (n: number) => ({ uid: `buyer-${n}`, name: `Buyer ${n}`, email: `buyer${n}@example.test` });

async function makeEvent(quantity: number, price = 2500) {
  const ref = db.collection(`tenants/${T}/events`).doc();
  const start = new Date(Date.now() + 7 * 86_400_000);
  await ref.set({
    organizerId: 'org-test',
    title: 'Integration Night',
    slug: `integration-${ref.id.toLowerCase()}`,
    status: 'published',
    startAt: start,
    endAt: new Date(start.getTime() + 3 * 3_600_000),
    totalSold: 0,
    totalQuantity: quantity,
  });
  await ref.collection('ticketTypes').doc('ga').set({
    name: 'GA',
    price,
    currency: 'USD',
    quantity,
    sold: 0,
    reserved: 0,
    salesStartAt: null,
    salesEndAt: null,
    order: 0,
  });
  return ref.id;
}
const tt = async (eventId: string) =>
  (await db.doc(`tenants/${T}/events/${eventId}/ticketTypes/ga`).get()).data()!;

beforeAll(async () => {
  tenant = (await getTenantById(T))!;
  expect(tenant.paymentConfig.provider).toBe('test');
});

describe('reservations', () => {
  it('never oversells: 6 buyers race for 2 seats → exactly 2 holds', async () => {
    const eventId = await makeEvent(2);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        createPendingOrder(tenant, buyer(i), eventId, [{ ticketTypeId: 'ga', quantity: 1 }]),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    for (const r of results.filter((r) => r.status === 'rejected'))
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(CheckoutError);
    expect(await tt(eventId)).toMatchObject({ reserved: 2, sold: 0 });
  });

  it('prices come from the ticket type, with the service fee from commissionRate', async () => {
    const eventId = await makeEvent(10, 4500);
    const { orderId } = await createPendingOrder(tenant, buyer(1), eventId, [
      { ticketTypeId: 'ga', quantity: 2 },
    ]);
    const o = (await db.doc(`tenants/${T}/orders/${orderId}`).get()).data()!;
    const fee = Math.round(4500 * tenant.commissionRate);
    expect(o).toMatchObject({
      status: 'pending',
      subtotal: 9000,
      fees: fee * 2,
      total: 9000 + fee * 2,
      currency: 'USD',
    });
  });

  it('expired holds are released', async () => {
    const eventId = await makeEvent(3);
    const { orderId } = await createPendingOrder(tenant, buyer(1), eventId, [
      { ticketTypeId: 'ga', quantity: 3 },
    ]);
    await db
      .doc(`tenants/${T}/orders/${orderId}`)
      .update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    expect(await expireStaleOrders(T, eventId)).toBe(1);
    expect((await db.doc(`tenants/${T}/orders/${orderId}`).get()).get('status')).toBe('expired');
    expect(await tt(eventId)).toMatchObject({ reserved: 0 });
  });
});

describe('payment webhook', () => {
  it('rejects a bad signature', async () => {
    const { body } = buildTestWebhook(T, 'x', 'payment.succeeded');
    const res = await processWebhook('test', body, new Headers({ 'x-test-signature': 'deadbeef' }));
    expect(res.status).toBe(400);
  });

  it('paid → tickets, sold/reserved, idempotent on replay, email written', async () => {
    const eventId = await makeEvent(5);
    const { orderId } = await createPendingOrder(tenant, buyer(7), eventId, [
      { ticketTypeId: 'ga', quantity: 2 },
    ]);
    await db.doc(`tenants/${T}/orders/${orderId}`).update({
      attendees: [
        { name: 'Ann', email: 'ann@example.test' },
        { name: 'Bob', email: 'buyer7@example.test' },
      ],
    });
    const { body, signature } = buildTestWebhook(T, orderId, 'payment.succeeded');
    const headers = new Headers({ 'x-test-signature': signature });

    expect(await processWebhook('test', body, headers)).toEqual({ status: 200, body: 'fulfilled' });
    expect(await processWebhook('test', body, headers)).toEqual({ status: 200, body: 'duplicate' });

    const order = (await db.doc(`tenants/${T}/orders/${orderId}`).get()).data()!;
    expect(order.status).toBe('paid');
    const tickets = await db.collection(`tenants/${T}/tickets`).where('orderId', '==', orderId).get();
    expect(tickets.size).toBe(2);
    expect(tickets.docs.map((d) => d.get('attendeeName')).sort()).toEqual(['Ann', 'Bob']);
    expect(await tt(eventId)).toMatchObject({ sold: 2, reserved: 0 });
    expect((await db.doc(`tenants/${T}/events/${eventId}`).get()).get('totalSold')).toBe(2);

    // Cloud Function onOrderPaid → dev mailbox (emulator).
    let emails: string[] = [];
    for (let i = 0; i < 30 && emails.length < 2; i++) {
      await new Promise((r) => setTimeout(r, 500));
      emails = (await db.collection('devEmails').where('tenantId', '==', T).get()).docs
        .filter((d) => (d.get('subject') as string).includes('Integration Night'))
        .map((d) => d.get('to') as string);
    }
    expect(emails).toEqual(expect.arrayContaining(['buyer7@example.test', 'ann@example.test']));
  });

  it('a late payment is honoured if seats are free, otherwise flagged for refund', async () => {
    const eventId = await makeEvent(1);
    const late = await createPendingOrder(tenant, buyer(1), eventId, [{ ticketTypeId: 'ga', quantity: 1 }]);
    await db
      .doc(`tenants/${T}/orders/${late.orderId}`)
      .update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    await expireStaleOrders(T, eventId);
    const other = await createPendingOrder(tenant, buyer(2), eventId, [{ ticketTypeId: 'ga', quantity: 1 }]);
    expect(
      await fulfilOrder({
        tenantId: T,
        orderId: other.orderId,
        provider: 'test',
        providerEventId: `e-${other.orderId}`,
        paymentRef: 'p1',
      }),
    ).toBe('fulfilled');
    // The first buyer pays after their hold expired and the only seat was sold.
    expect(
      await fulfilOrder({
        tenantId: T,
        orderId: late.orderId,
        provider: 'test',
        providerEventId: `e-${late.orderId}`,
        paymentRef: 'p2',
      }),
    ).toBe('refund_required');
    expect(await tt(eventId)).toMatchObject({ sold: 1, reserved: 0 });
  });

  it('events for another marketplace’s provider are ignored', async () => {
    await db.doc('tenants/other').update({ paymentConfig: { provider: 'stripe', chargesEnabled: false } });
    try {
      const { body, signature } = buildTestWebhook('other', 'any', 'payment.succeeded');
      expect(await processWebhook('test', body, new Headers({ 'x-test-signature': signature }))).toEqual({
        status: 200,
        body: 'unknown tenant',
      });
    } finally {
      await db.doc('tenants/other').update({ paymentConfig: { provider: 'test', chargesEnabled: false } });
    }
  });
});

describe('refunds', () => {
  it('cancels tickets, returns seats and writes the audit log', async () => {
    const eventId = await makeEvent(4);
    const { orderId } = await createPendingOrder(tenant, buyer(3), eventId, [
      { ticketTypeId: 'ga', quantity: 2 },
    ]);
    await fulfilOrder({
      tenantId: T,
      orderId,
      provider: 'test',
      providerEventId: `r-${orderId}`,
      paymentRef: 'test_pi_x',
    });
    await expect(refundOrder(tenant, orderId, 'admin-uid', () => false)).rejects.toThrow('Order not found.');
    await refundOrder(tenant, orderId, 'org-uid', (org) => org === 'org-test');

    expect((await db.doc(`tenants/${T}/orders/${orderId}`).get()).get('status')).toBe('refunded');
    const tickets = await db.collection(`tenants/${T}/tickets`).where('orderId', '==', orderId).get();
    expect(tickets.docs.every((d) => d.get('status') === 'cancelled')).toBe(true);
    expect(await tt(eventId)).toMatchObject({ sold: 0 });
    const logs = await db.collection(`tenants/${T}/auditLogs`).where('target.orderId', '==', orderId).get();
    expect(logs.docs.map((d) => d.get('action'))).toEqual(['refund']);
    await expect(refundOrder(tenant, orderId, 'org-uid', () => true)).rejects.toThrow('Only paid orders');
  });
});

afterAll(async () => {
  void FieldValue;
});
