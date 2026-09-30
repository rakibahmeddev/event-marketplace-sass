import 'server-only';

import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { PaymentEvent, PaymentProvider } from './types';
import { WebhookSignatureError } from './types';

/**
 * Local development / E2E adapter. Simulates a hosted checkout page and signed webhooks so the full
 * purchase flow runs against the emulators without a Stripe account. Refused in production.
 */
export const testPaymentsAllowed = () => process.env.NODE_ENV !== 'production';

function secret(): string {
  const s = process.env.TEST_PAYMENT_WEBHOOK_SECRET;
  if (!s || s.length < 32) throw new Error('TEST_PAYMENT_WEBHOOK_SECRET (32+ chars) is not configured');
  return s;
}

const bodySchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(['payment.succeeded', 'payment.failed', 'checkout.expired']),
    tenantId: z.string(),
    orderId: z.string(),
  })
  .strict();

export function signTestWebhook(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('hex');
}

/** Builds a signed webhook body as the fake provider would send it. */
export function buildTestWebhook(
  tenantId: string,
  orderId: string,
  type: z.infer<typeof bodySchema>['type'],
) {
  const body = JSON.stringify({ id: `evt_test_${randomUUID()}`, type, tenantId, orderId });
  return { body, signature: signTestWebhook(body) };
}

export const testProvider: PaymentProvider = {
  id: 'test',

  async createCheckout(req) {
    if (!testPaymentsAllowed()) throw new Error('Test payments are disabled in production');
    return { url: `/checkout/${req.orderId}/test-payment`, ref: `test_cs_${req.orderId}` };
  },

  async handleWebhook(rawBody, headers): Promise<PaymentEvent> {
    if (!testPaymentsAllowed()) throw new WebhookSignatureError('Test payments are disabled');
    const given = Buffer.from(headers.get('x-test-signature') ?? '', 'hex');
    const expected = Buffer.from(signTestWebhook(rawBody), 'hex');
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      throw new WebhookSignatureError('Invalid signature');
    const parsed = bodySchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) throw new WebhookSignatureError('Invalid body');
    const e = parsed.data;
    if (e.type === 'payment.succeeded') {
      return {
        kind: 'paid',
        eventId: e.id,
        tenantId: e.tenantId,
        orderId: e.orderId,
        paymentRef: `test_pi_${e.orderId}`,
        accountId: null,
      };
    }
    return {
      kind: e.type === 'payment.failed' ? 'failed' : 'expired',
      eventId: e.id,
      tenantId: e.tenantId,
      orderId: e.orderId,
      accountId: null,
    };
  },

  async refund({ paymentRef }) {
    if (!testPaymentsAllowed()) throw new Error('Test payments are disabled in production');
    return { refundRef: `test_re_${paymentRef}` };
  },
};
