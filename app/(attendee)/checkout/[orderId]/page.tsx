import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { requireUser } from '@/lib/auth/guards';
import { getEvent } from '@/lib/events/repository';
import { venueLabel } from '@/lib/events/view';
import { formatMoney } from '@/lib/format/money';
import { eventDateLabels } from '@/lib/format/time';
import { getOrder } from '@/lib/orders/repository';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const order = await getOrder(tenant.id, (await params).orderId);
  if (!order || order.buyerUid !== user.uid) notFound();
  if (order.status === 'paid') redirect(`/orders/${order.id}/confirmation`);

  const event = await getEvent(tenant.id, order.eventId);
  if (!event) notFound();
  const eventHref = `/events/${event.slug}`;
  const active = order.status === 'pending' && !!order.expiresAt && order.expiresAt > new Date();
  const dateLine =
    event.startAt && event.endAt
      ? `${eventDateLabels(event.startAt, event.endAt, event.timezone).short} · ${venueLabel(event)}`
      : venueLabel(event);
  const seats = order.items.flatMap((i) =>
    Array.from({ length: i.quantity }, (_, k) => ({ key: `${i.ticketTypeId}-${k}`, ticketTypeName: i.name })),
  );

  return (
    <div className="page-container grid items-start gap-8 py-8 md:py-10 lg:grid-cols-12">
      <div className="flex flex-col gap-5 lg:col-span-7">
        <h1 className="type-h3">Checkout</h1>
        {active ? (
          <CheckoutForm
            orderId={order.id}
            expiresAt={order.expiresAt!.getTime()}
            eventHref={eventHref}
            seats={seats}
            buyer={{ name: order.buyerName || user.name || '', email: order.buyerEmail || user.email || '' }}
            totalLabel={formatMoney(order.total, order.currency)}
            isFree={order.total === 0}
            cancelled={(await searchParams).cancelled === '1'}
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-card border border-line-soft bg-white p-7">
            <h2 className="type-h4">This checkout is no longer active</h2>
            <p className="text-slate-600">
              {order.status === 'refunded'
                ? 'This order was refunded.'
                : 'The reservation expired or was cancelled. Your card was not charged.'}
            </p>
            <a href={eventHref} className="font-semibold text-primary hover:underline">
              Choose tickets again
            </a>
          </div>
        )}
      </div>
      <div className="lg:col-span-5 lg:mt-[68px]">
        <OrderSummary
          title={event.title}
          dateLine={dateLine}
          imageUrl={event.images[0]?.url}
          items={order.items}
          fees={order.fees}
          total={order.total}
          currency={order.currency}
        />
      </div>
    </div>
  );
}
