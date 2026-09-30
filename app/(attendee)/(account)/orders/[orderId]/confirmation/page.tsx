import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  faCalendarPlus,
  faCheck,
  faCircleInfo,
  faDownload,
  faTicket,
} from '@fortawesome/free-solid-svg-icons';
import { AwaitPayment } from '@/components/tickets/AwaitPayment';
import { QrTicket } from '@/components/tickets/QrTicket';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { requireUser } from '@/lib/auth/guards';
import { getEvent } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { getOrder, listOrderTickets } from '@/lib/orders/repository';
import { ticketQrSvg } from '@/lib/tickets/qr';
import { ticketCardData } from '@/lib/tickets/view';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Order confirmation', robots: { index: false } };

export default async function ConfirmationPage({ params }: { params: Promise<{ orderId: string }> }) {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const order = await getOrder(tenant.id, (await params).orderId);
  if (!order || order.buyerUid !== user.uid) notFound();
  const event = await getEvent(tenant.id, order.eventId);
  if (!event) notFound();

  if (order.status !== 'paid') {
    return (
      <div className="page-container flex max-w-2xl flex-col gap-4 py-16">
        <h1 className="type-h3">{order.status === 'pending' ? 'Almost there' : 'Payment not completed'}</h1>
        {order.status === 'pending' ? (
          <AwaitPayment />
        ) : (
          <p className="text-slate-600">
            This order is {order.status}. You weren’t charged, or the payment was refunded.
          </p>
        )}
        <div>
          <ButtonLink href={`/events/${event.slug}`} variant="secondary">
            Back to the event
          </ButtonLink>
        </div>
      </div>
    );
  }

  const tickets = await listOrderTickets(tenant.id, [order.id]);
  const first = tickets[0];
  const firstSvg = first ? await ticketQrSvg(first.id, tenant.id) : '';
  const seats = tickets.length;
  const others = tickets
    .filter((t) => t.attendeeEmail && t.attendeeEmail !== order.buyerEmail)
    .map((t) => t.attendeeName);
  const firstName = (order.buyerName || user.name || '').split(' ')[0];
  const paidOn = order.paidAt
    ? new Intl.DateTimeFormat('en-US', { timeZone: tenant.timezone, dateStyle: 'medium' }).format(
        order.paidAt,
      )
    : '';

  return (
    <div className="bg-mist">
      <div className="page-container grid items-start gap-8 py-10 md:py-14 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="flex flex-col gap-4">
            <span className="grid size-16 place-items-center rounded-full bg-success text-[28px] text-white shadow-[0_0_0_8px_var(--color-success-bg)]">
              <Icon icon={faCheck} />
            </span>
            <h1 className="mt-2 font-display text-[32px] leading-10 font-extrabold tracking-[-0.03em] md:text-5xl md:leading-[56px]">
              You’re going{firstName ? `, ${firstName}` : ''}!
            </h1>
            <p className="max-w-[560px] text-[17px] leading-[27px] text-slate-600">
              Your {seats} ticket{seats === 1 ? ' is' : 's are'} confirmed. We’re emailing{' '}
              {seats === 1 ? 'it' : 'them'} to <b className="text-ink">{order.buyerEmail}</b> — you can also
              find {seats === 1 ? 'it' : 'them'} anytime in My tickets.
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <ButtonLink href="/account/tickets" size="lg" leadingIcon={<Icon icon={faTicket} />}>
                View my tickets
              </ButtonLink>
              <a
                href={`/api/orders/${order.id}/pdf`}
                className="flex h-14 items-center gap-2.5 rounded-lg border-[1.5px] border-line-strong bg-white px-5 text-base font-semibold hover:bg-mist focus-ring"
              >
                <Icon icon={faDownload} />
                Download PDF
              </a>
              <a
                href={`/events/${event.slug}/calendar`}
                className="flex h-14 items-center gap-2.5 rounded-lg border-[1.5px] border-line-strong bg-white px-5 text-base font-semibold hover:bg-mist focus-ring"
              >
                <Icon icon={faCalendarPlus} />
                Add to calendar
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-card border border-line-soft bg-white">
            <div className="flex justify-between border-b border-line-soft px-6 py-[18px]">
              <b className="font-display text-[17px]">Order {order.id.slice(0, 8).toUpperCase()}</b>
              <span className="text-sm text-slate-600">{paidOn}</span>
            </div>
            <div className="flex flex-col gap-3 px-6 py-[18px] text-[15px]">
              {order.items.map((i) => (
                <div key={i.ticketTypeId} className="flex justify-between">
                  <span>
                    {i.quantity} × {i.name}
                  </span>
                  <span>{formatMoney(i.unitPrice * i.quantity, order.currency)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm text-slate-600">
                <span>Fees</span>
                <span>{formatMoney(order.fees, order.currency)}</span>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-3">
                <b>Total paid</b>
                <b className="font-display text-xl font-extrabold">
                  {formatMoney(order.total, order.currency)}
                </b>
              </div>
            </div>
          </div>
          <div className="flex gap-3.5 rounded-[14px] bg-primary-50 px-5 py-[18px] text-sm leading-[21px] text-body">
            <Icon icon={faCircleInfo} className="mt-[3px] text-primary" />
            <span>
              Show the QR code on your phone at the door — no printing needed. Each ticket can be scanned
              once.
              {others.length > 0 && ` Tickets were also emailed to ${others.join(', ')}.`}
            </span>
          </div>
        </div>
        {first && (
          <div className="flex justify-center lg:col-span-5">
            <QrTicket
              ticket={ticketCardData(
                first,
                event,
                tenant.branding.name,
                `Ticket 1 of ${seats} · Order ${order.id.slice(0, 8).toUpperCase()}`,
              )}
              svg={firstSvg}
              status={first.status}
            />
          </div>
        )}
      </div>
    </div>
  );
}
