'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { startStripeOnboarding } from '@/lib/payments/connect';

type Props = {
  provider: 'stripe' | 'test';
  stripeAccountId?: string;
  chargesEnabled: boolean;
  stripeAvailable: boolean;
  notice?: string;
};

/** Admin → Settings → Payments: connect the marketplace's own Stripe account (Stripe Connect). */
export function PaymentsPanel({ provider, stripeAccountId, chargesEnabled, stripeAvailable, notice }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function connect() {
    setPending(true);
    const res = await startStripeOnboarding();
    if (res.ok) return window.location.assign(res.data.url);
    setPending(false);
    setError(res.error);
  }
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Payments</h2>
          <p className="text-sm text-slate-600">
            Buyers pay into your own Stripe account. Card details never touch this platform.
          </p>
        </div>
        {provider === 'stripe' && chargesEnabled ? (
          <Badge tone="success" size="md">
            Stripe connected
          </Badge>
        ) : provider === 'test' ? (
          <Badge tone="warning" size="md">
            Test payments
          </Badge>
        ) : (
          <Badge tone="danger" size="md">
            Not ready
          </Badge>
        )}
      </div>
      {notice === 'connected' && (
        <Alert tone="success">Stripe is connected. New checkouts use your Stripe account.</Alert>
      )}
      {notice === 'incomplete' && (
        <Alert tone="warning">Stripe onboarding isn’t finished yet. Continue to enable payments.</Alert>
      )}
      {error && <Alert tone="danger">{error}</Alert>}
      {provider === 'test' && (
        <p className="text-sm text-slate-600">
          This marketplace uses the <b>test payment provider</b> (development only — no real money moves).
          Connect Stripe to take real payments.
        </p>
      )}
      {stripeAccountId && <p className="font-mono text-xs text-slate-500">Account {stripeAccountId}</p>}
      {!(provider === 'stripe' && chargesEnabled) && (
        <div>
          <Button
            onClick={connect}
            loading={pending}
            loadingText="Opening Stripe"
            disabled={!stripeAvailable}
          >
            {stripeAccountId ? 'Continue Stripe setup' : 'Connect Stripe'}
          </Button>
          {!stripeAvailable && (
            <p className="mt-2 text-xs text-slate-500">
              Stripe keys aren’t configured on the server yet (see docs/setup.md).
            </p>
          )}
        </div>
      )}
    </section>
  );
}
