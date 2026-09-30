import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { getPaymentProvider } from '@/lib/payments';
import { PROVIDER_IDS, WebhookSignatureError, type ProviderId } from '@/lib/payments/types';
import { getTenantById } from '@/lib/tenant/repository';
import { fulfilOrder } from './fulfil';
import { releaseOrder } from './reserve';

export type WebhookOutcome = { status: number; body: string };

export function isProviderId(v: string): v is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(v);
}

/**
 * Verify → match tenant → act. The tenant comes from signed metadata AND must be configured for this
 * provider (for Stripe, the event's connected account must be the tenant's account), so one
 * marketplace's payments can never mark another marketplace's orders as paid.
 */
export async function processWebhook(
  providerId: ProviderId,
  rawBody: string,
  headers: Headers,
): Promise<WebhookOutcome> {
  let event;
  try {
    event = await getPaymentProvider(providerId).handleWebhook(rawBody, headers);
  } catch (err) {
    if (err instanceof WebhookSignatureError) return { status: 400, body: 'invalid signature' };
    throw err;
  }
  if (event.kind === 'ignored') return { status: 200, body: 'ignored' };

  const tenant = await getTenantById(event.tenantId);
  if (!tenant || tenant.paymentConfig.provider !== providerId) return { status: 200, body: 'unknown tenant' };
  if (providerId === 'stripe' && event.accountId !== (tenant.paymentConfig.stripeAccountId ?? null)) {
    return { status: 200, body: 'account mismatch' };
  }

  if (event.kind === 'paid') {
    const result = await fulfilOrder({
      tenantId: tenant.id,
      orderId: event.orderId,
      provider: providerId,
      providerEventId: event.eventId,
      paymentRef: event.paymentRef,
    });
    if (result === 'refund_required') {
      // Paid after the hold expired and the seats were taken: give the money back.
      await getPaymentProvider(providerId).refund({
        paymentRef: event.paymentRef,
        amount: await orderTotal(tenant.id, event.orderId),
        accountId: tenant.paymentConfig.stripeAccountId,
        idempotencyKey: `late_refund_${tenant.id}_${event.orderId}`,
      });
    }
    return { status: 200, body: result };
  }
  await releaseOrder(tenant.id, event.orderId, event.kind);
  return { status: 200, body: event.kind };
}

async function orderTotal(tenantId: string, orderId: string): Promise<number> {
  return ((await adminDb().doc(`tenants/${tenantId}/orders/${orderId}`).get()).get('total') as number) ?? 0;
}
