import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { QrTicket } from '@/components/tickets/QrTicket';
import { Icon } from '@/components/ui/Icon';
import { requireUser } from '@/lib/auth/guards';
import { getEvent } from '@/lib/events/repository';
import { getOrder, getTicket, listOrderTickets } from '@/lib/orders/repository';
import { ticketQrSvg } from '@/lib/tickets/qr';
import { ticketCardData } from '@/lib/tickets/view';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Ticket', robots: { index: false } };

/** Design 06 · QR ticket view. Only the buyer of the order can open it. */
export default async function TicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const ticket = await getTicket(tenant.id, (await params).ticketId);
  const order = ticket ? await getOrder(tenant.id, ticket.orderId) : null;
  if (!ticket || !order || order.buyerUid !== user.uid) notFound();
  const [event, siblings] = await Promise.all([
    getEvent(tenant.id, ticket.eventId),
    listOrderTickets(tenant.id, [order.id]),
  ]);
  if (!event) notFound();
  const index = siblings.findIndex((t) => t.id === ticket.id) + 1;
  const svg = ticket.status === 'cancelled' ? '' : await ticketQrSvg(ticket.id, tenant.id);
  return (
    <div className="bg-mist">
      <div className="page-container flex flex-col items-center gap-5 py-8">
        <Link
          href="/account/tickets"
          className="flex items-center gap-2 self-start text-sm font-semibold text-slate-600 hover:text-ink"
        >
          <Icon icon={faArrowLeft} className="text-xs" />
          My tickets
        </Link>
        <QrTicket
          ticket={ticketCardData(
            ticket,
            event,
            tenant.branding.name,
            `Ticket ${index} of ${siblings.length} · Order ${order.id.slice(0, 8).toUpperCase()}`,
          )}
          svg={svg}
          status={ticket.status}
        />
        <p className="max-w-sm text-center text-sm text-slate-600">
          Turn your screen brightness up at the door. Each ticket can be scanned once.
        </p>
      </div>
    </div>
  );
}
