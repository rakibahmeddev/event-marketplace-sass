/** Provider-agnostic payment layer (CLAUDE.md → Payments). One adapter per provider; chosen per tenant. */

export const PROVIDER_IDS = ['stripe', 'test'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export type CheckoutRequest = {
  tenantId: string;
  orderId: string;
  currency: string;
  lines: { name: string; unitAmount: number; quantity: number }[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** Our reservation expiry; adapters may use a later provider minimum. */
  expiresAt: Date;
  /** Connected account of the tenant (Stripe Connect). */
  accountId?: string;
};

export type CheckoutSession = { url: string; ref: string };

/** Normalised webhook outcome. `eventId` is the provider's event id, used for idempotency. */
export type PaymentEvent =
  | {
      kind: 'paid';
      eventId: string;
      tenantId: string;
      orderId: string;
      paymentRef: string;
      accountId: string | null;
    }
  | {
      kind: 'expired' | 'failed';
      eventId: string;
      tenantId: string;
      orderId: string;
      accountId: string | null;
    }
  | { kind: 'ignored'; eventId: string };

export class WebhookSignatureError extends Error {}

export interface PaymentProvider {
  readonly id: ProviderId;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  /** Verifies the signature (throws WebhookSignatureError) and normalises the event. */
  handleWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  refund(args: {
    paymentRef: string;
    amount: number;
    accountId?: string;
    idempotencyKey: string;
  }): Promise<{ refundRef: string }>;
}
