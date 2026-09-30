'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { simulateTestPayment } from '@/lib/checkout/actions';

export function TestPaymentButtons({ orderId }: { orderId: string }) {
  const [pending, setPending] = useState<'succeeded' | 'failed' | null>(null);
  const [error, setError] = useState<string>();
  async function run(outcome: 'succeeded' | 'failed') {
    setPending(outcome);
    const res = await simulateTestPayment(orderId, outcome);
    if (!res.ok) {
      setError(res.error);
      setPending(null);
      return;
    }
    window.location.assign(
      outcome === 'succeeded' ? `/orders/${orderId}/confirmation` : `/checkout/${orderId}?cancelled=1`,
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <Button
        size="lg"
        fullWidth
        onClick={() => run('succeeded')}
        loading={pending === 'succeeded'}
        disabled={!!pending}
      >
        Pay (test)
      </Button>
      <Button
        variant="secondary"
        fullWidth
        onClick={() => run('failed')}
        loading={pending === 'failed'}
        disabled={!!pending}
      >
        Simulate a declined payment
      </Button>
    </div>
  );
}
