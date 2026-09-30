import 'server-only';

import Stripe from 'stripe';
import type { CheckoutRequest, PaymentEvent, PaymentProvider } from './types';
import { WebhookSignatureError } from './types';

let client: Stripe | undefined;
export function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  client ??= new Stripe(key);
  return client;
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
}

/** Stripe Connect: charges run on the tenant's own connected account (direct charges). */
export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  async createCheckout(req: CheckoutRequest) {
    if (!req.accountId) throw new Error('This marketplace has not connected a Stripe account');
    // Stripe requires sessions to live ≥ 30 min; our reservation (10 min) is enforced separately.
    const expiresAt = Math.max(
      Math.floor(req.expiresAt.getTime() / 1000),
      Math.floor(Date.now() / 1000) + 31 * 60,
    );
    const session = await stripeClient().checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: req.customerEmail,
        line_items: req.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: req.currency.toLowerCase(),
            unit_amount: l.unitAmount,
            product_data: { name: l.name },
          },
        })),
        success_url: req.successUrl,
        cancel_url: req.cancelUrl,
        expires_at: expiresAt,
        metadata: { tenantId: req.tenantId, orderId: req.orderId },
        payment_intent_data: { metadata: { tenantId: req.tenantId, orderId: req.orderId } },
      },
      {
        stripeAccount: req.accountId,
        idempotencyKey: `checkout_${req.orderId}_${Math.floor(Date.now() / 60_000)}`,
      },
    );
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url, ref: session.id };
  },

  async handleWebhook(rawBody, headers): Promise<PaymentEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = headers.get('stripe-signature');
    if (!secret || !signature) throw new WebhookSignatureError('Missing signature');
    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new WebhookSignatureError('Invalid signature');
    }
    const accountId = event.account ?? null;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const s = event.data.object;
        const { tenantId, orderId } = s.metadata ?? {};
        if (!tenantId || !orderId) return { kind: 'ignored', eventId: event.id };
        if (s.payment_status !== 'paid') return { kind: 'ignored', eventId: event.id };
        const pi = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? s.id);
        return { kind: 'paid', eventId: event.id, tenantId, orderId, paymentRef: pi, accountId };
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const { tenantId, orderId } = event.data.object.metadata ?? {};
        if (!tenantId || !orderId) return { kind: 'ignored', eventId: event.id };
        return {
          kind: event.type === 'checkout.session.expired' ? 'expired' : 'failed',
          eventId: event.id,
          tenantId,
          orderId,
          accountId,
        };
      }
      default:
        return { kind: 'ignored', eventId: event.id };
    }
  },

  async refund({ paymentRef, amount, accountId, idempotencyKey }) {
    const r = await stripeClient().refunds.create(
      { payment_intent: paymentRef, amount },
      { stripeAccount: accountId, idempotencyKey },
    );
    return { refundRef: r.id };
  },
};
