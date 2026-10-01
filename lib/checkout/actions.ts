'use server';

import { headers } from 'next/headers';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { getPaymentProvider } from '@/lib/payments';
import { buildTestWebhook, testPaymentsAllowed } from '@/lib/payments/test';
import { fulfilOrder } from '@/lib/orders/fulfil';
import { getOrder } from '@/lib/orders/repository';
import {
  CheckoutError,
  createPendingOrder,
  expireStaleOrders,
  releaseBuyerPendingOrders,
  releaseOrder,
} from '@/lib/orders/reserve';
import { checkoutDetailsSchema, startCheckoutSchema } from '@/lib/orders/schema';
import { processWebhook } from '@/lib/orders/webhook';
import { rateLimit } from '@/lib/security/rateLimit';
import { getCurrentTenant } from '@/lib/tenant/current';

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.') || host.endsWith('.localhost')
      ? 'http'
      : 'https');
  return `${proto}://${host}`;
}

/** Event page → "Get tickets": reserve seats for 10 minutes and open the checkout page. */
export async function startCheckout(
  input: unknown,
): Promise<ActionResult<{ orderId: string }> | { ok: false; error: 'login_required' }> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!tenant) return fail('Marketplace unavailable.');
  if (!user) return { ok: false, error: 'login_required' };
  // Scanner staff accounts can only check tickets in (CLAUDE.md → Roles).
  if (user.role === 'scanner')
    return fail('Staff accounts can’t buy tickets. Log in with a personal account.');
  if (!(await rateLimit(`checkout:${user.uid}`, { limit: 10, windowSeconds: 60 })))
    return fail('Too many checkout attempts. Wait a minute.');
  const parsed = startCheckoutSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid request.');

  try {
    await expireStaleOrders(tenant.id, parsed.data.eventId);
    await releaseBuyerPendingOrders(tenant.id, user.uid, parsed.data.eventId);
    const { orderId } = await createPendingOrder(
      tenant,
      { uid: user.uid, name: user.name ?? '', email: user.email ?? '' },
      parsed.data.eventId,
      parsed.data.items,
    );
    return { ok: true, data: { orderId } };
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    throw err;
  }
}

/** Checkout page → buyer + attendee details, then hand over to the payment provider. */
export async function submitCheckout(input: unknown): Promise<ActionResult<{ url: string }>> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return fail('Please log in again.');
  if (!(await rateLimit(`pay:${user.uid}`, { limit: 10, windowSeconds: 60 })))
    return fail('Too many attempts. Wait a minute.');
  const parsed = checkoutDetailsSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const d = parsed.data;

  const order = await getOrder(tenant.id, d.orderId);
  if (!order || order.buyerUid !== user.uid) return fail('Order not found.');
  if (order.status !== 'pending' || !order.expiresAt || order.expiresAt <= new Date()) {
    return fail('Your reservation expired. Please choose your tickets again.');
  }
  const seats = order.items.reduce((n, i) => n + i.quantity, 0);
  if (d.attendees.length !== seats) return fail('Add details for every ticket.');

  await adminDb()
    .doc(`tenants/${tenant.id}/orders/${order.id}`)
    .update({ buyerName: d.buyerName, buyerEmail: d.buyerEmail, attendees: d.attendees });

  const base = await origin();
  const lines = order.items
    .map((i) => ({ name: i.name, unitAmount: i.unitPrice, quantity: i.quantity }))
    .filter((l) => l.unitAmount > 0);
  if (order.fees > 0) lines.push({ name: 'Service fee', unitAmount: order.fees, quantity: 1 });

  if (order.total === 0) {
    // Free order (total computed on the server): nothing to charge, confirm directly and idempotently.
    await fulfilOrder({
      tenantId: tenant.id,
      orderId: order.id,
      provider: 'free',
      providerEventId: order.id,
      paymentRef: 'free',
    });
    return { ok: true, data: { url: `/orders/${order.id}/confirmation` } };
  }
  const provider = getPaymentProvider(tenant.paymentConfig.provider);
  const session = await provider.createCheckout({
    tenantId: tenant.id,
    orderId: order.id,
    currency: order.currency,
    lines,
    customerEmail: d.buyerEmail,
    successUrl: `${base}/orders/${order.id}/confirmation`,
    cancelUrl: `${base}/checkout/${order.id}?cancelled=1`,
    expiresAt: order.expiresAt,
    accountId: tenant.paymentConfig.stripeAccountId,
  });
  await adminDb()
    .doc(`tenants/${tenant.id}/orders/${order.id}`)
    .update({ provider: provider.id, checkoutRef: session.ref });
  return { ok: true, data: { url: session.url } };
}

/** "Cancel" on the checkout page: give the seats back now instead of waiting for the hold to expire. */
export async function cancelCheckout(orderId: string): Promise<ActionResult> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return fail('Please log in again.');
  const order = await getOrder(tenant.id, orderId);
  if (!order || order.buyerUid !== user.uid) return fail('Order not found.');
  await releaseOrder(tenant.id, order.id, 'expired');
  return { ok: true };
}

/** Development only: the fake payment page "pays" by sending itself a signed webhook. */
export async function simulateTestPayment(
  orderId: string,
  outcome: 'succeeded' | 'failed',
): Promise<ActionResult> {
  if (!testPaymentsAllowed() || (outcome !== 'succeeded' && outcome !== 'failed'))
    return fail('Not available.');
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || tenant.paymentConfig.provider !== 'test') return fail('Not available.');
  const order = await getOrder(tenant.id, orderId);
  if (!order || order.buyerUid !== user.uid) return fail('Order not found.');
  const { body, signature } = buildTestWebhook(
    tenant.id,
    order.id,
    outcome === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
  );
  const res = await processWebhook('test', body, new Headers({ 'x-test-signature': signature }));
  return res.status === 200 ? { ok: true } : fail(`Webhook rejected (${res.body}).`);
}
