'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { refundOrderAction } from '@/lib/orders/actions';

export function RefundButton({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function run() {
    if (
      !window.confirm(`Refund ${label}? All tickets in this order will be cancelled. This can’t be undone.`)
    )
      return;
    setPending(true);
    const res = await refundOrderAction(orderId);
    setPending(false);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" onClick={run} loading={pending} loadingText="Refunding">
        Refund
      </Button>
      {error && (
        <span role="alert" className="max-w-[220px] text-right text-xs text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
