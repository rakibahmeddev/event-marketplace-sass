'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** Returning from the payment page before the webhook lands: re-check every 2 s for up to a minute. */
export function AwaitPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 30) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return (
    <p role="status" className="text-slate-600">
      {tries >= 30
        ? 'This is taking longer than usual. Refresh the page in a minute, or check My tickets.'
        : 'Confirming your payment…'}
    </p>
  );
}
