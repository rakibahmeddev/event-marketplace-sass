import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TestPaymentButtons } from '@/components/checkout/TestPaymentButtons';
import { Alert } from '@/components/ui/Alert';
import { requireUser } from '@/lib/auth/guards';
import { formatMoney } from '@/lib/format/money';
import { getOrder } from '@/lib/orders/repository';
import { testPaymentsAllowed } from '@/lib/payments/test';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Test payment', robots: { index: false } };

/** Stand-in for the provider's hosted payment page (local development only). */
export default async function TestPaymentPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (!testPaymentsAllowed()) notFound();
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const order = await getOrder(tenant.id, (await params).orderId);
  if (!order || order.buyerUid !== user.uid || tenant.paymentConfig.provider !== 'test') notFound();
  return (
    <div className="page-container flex justify-center py-12">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-panel border border-line-soft bg-white p-7">
        <Alert tone="warning" title="Test payment provider">
          Local development only — no real money moves. In production this is Stripe’s secure checkout page.
        </Alert>
        <div className="flex items-baseline justify-between">
          <span className="text-slate-600">Amount due</span>
          <b className="font-display text-3xl font-extrabold">{formatMoney(order.total, order.currency)}</b>
        </div>
        {order.status === 'pending' ? (
          <TestPaymentButtons orderId={order.id} />
        ) : (
          <p className="text-slate-600">This order is {order.status}.</p>
        )}
      </div>
    </div>
  );
}
