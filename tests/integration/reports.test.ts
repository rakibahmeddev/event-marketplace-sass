import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
process.env.FIREBASE_PROJECT_ID = 'demo-ticketing';
process.env.TEST_PAYMENT_WEBHOOK_SECRET ??= 'integration-test-webhook-secret-0123456789';

const { db } = await import('./helpers');
const { createPendingOrder } = await import('@/lib/orders/reserve');
const { refundOrder } = await import('@/lib/orders/refund');
const { processWebhook } = await import('@/lib/orders/webhook');
const { buildTestWebhook } = await import('@/lib/payments/test');
const { getTenantById } = await import('@/lib/tenant/repository');
const { dayKey } = await import('@/lib/reports/days');
const { organizerDaily, tenantDaily, eventTotals } = await import('@/lib/reports/repository');
const { rebuildSales } = await import('../../scripts/backfill-sales');

const T = 'demo';

async function makeEvent(organizerId: string, price = 4000) {
  const ref = db.collection(`tenants/${T}/events`).doc();
  const start = new Date(Date.now() + 7 * 86_400_000);
  await ref.set({
    organizerId,
    title: 'Report Night',
    slug: `report-${ref.id.toLowerCase()}`,
    status: 'published',
    startAt: start,
    endAt: new Date(start.getTime() + 3 * 3_600_000),
    totalSold: 0,
    totalQuantity: 20,
  });
  await ref.collection('ticketTypes').doc('ga').set({
    name: 'GA',
    price,
    currency: 'USD',
    quantity: 20,
    sold: 0,
    reserved: 0,
    salesStartAt: null,
    salesEndAt: null,
    order: 0,
  });
  return ref.id;
}

async function pay(eventId: string, quantity: number, n: number) {
  const tenant = (await getTenantById(T))!;
  const { orderId } = await createPendingOrder(
    tenant,
    { uid: `rep-buyer-${n}`, name: `Rep ${n}`, email: `rep${n}@example.test` },
    eventId,
    [{ ticketTypeId: 'ga', quantity }],
  );
  const { body, signature } = buildTestWebhook(T, orderId, 'payment.succeeded');
  const headers = new Headers({ 'x-test-signature': signature });
  expect(await processWebhook('test', body, headers)).toEqual({ status: 200, body: 'fulfilled' });
  // A replayed webhook must not count the sale twice.
  expect(await processWebhook('test', body, headers)).toEqual({ status: 200, body: 'duplicate' });
  return { tenant, orderId, order: (await db.doc(`tenants/${T}/orders/${orderId}`).get()).data()! };
}

describe('sales rollups', () => {
  it('a payment counts once on today’s tenant, organizer and event totals; a refund on the refund day', async () => {
    const org = `org-rep-${Date.now()}`;
    const eventId = await makeEvent(org);
    const tenant = (await getTenantById(T))!;
    const today = dayKey(new Date(), tenant.timezone);
    const tenantBefore = (await tenantDaily(T, today, today))[0];

    const { order, orderId } = await pay(eventId, 3, 1);
    const [day] = await organizerDaily(T, org, today, today);
    expect(day).toMatchObject({
      date: today,
      orders: 1,
      tickets: 3,
      gross: order.total,
      subtotal: 12000,
      fees: order.fees,
      refunds: 0,
    });
    const tenantAfter = (await tenantDaily(T, today, today))[0]!;
    expect(tenantAfter.gross - (tenantBefore?.gross ?? 0)).toBe(order.total);
    expect(tenantAfter.orders - (tenantBefore?.orders ?? 0)).toBe(1);
    expect((await eventTotals(T, [eventId])).get(eventId)).toMatchObject({
      orders: 1,
      tickets: 3,
      gross: order.total,
      ticketsIssued: 3,
      checkedIn: 0,
    });

    await refundOrder(tenant, orderId, 'org-uid', () => true);
    const [afterRefund] = await organizerDaily(T, org, today, today);
    expect(afterRefund).toMatchObject({
      orders: 1,
      refundedOrders: 1,
      refundedTickets: 3,
      refunds: order.total,
      refundedSubtotal: 12000,
      refundedFees: order.fees,
    });
    expect((await eventTotals(T, [eventId])).get(eventId)).toMatchObject({
      refunds: order.total,
      ticketsIssued: 0,
    });
  });

  it('the rebuild script reproduces the live counters', async () => {
    const org = `org-rep-${Date.now()}`;
    const eventId = await makeEvent(org, 2500);
    const tenant = (await getTenantById(T))!;
    const today = dayKey(new Date(), tenant.timezone);
    await pay(eventId, 2, 2);
    const { orderId } = await pay(eventId, 1, 3);
    await refundOrder(tenant, orderId, 'org-uid', () => true);

    const live = await organizerDaily(T, org, today, today);
    const liveTenant = await tenantDaily(T, today, today);
    const liveEvent = (await eventTotals(T, [eventId])).get(eventId);

    await rebuildSales(db, T);

    expect(await organizerDaily(T, org, today, today)).toEqual(live);
    expect(await tenantDaily(T, today, today)).toEqual(liveTenant);
    expect((await eventTotals(T, [eventId])).get(eventId)).toEqual(liveEvent);
  });
});
