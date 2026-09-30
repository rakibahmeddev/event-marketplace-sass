import { getSessionUser } from '@/lib/auth/session';
import { getEvent } from '@/lib/events/repository';
import { venueLabel } from '@/lib/events/view';
import { eventDateLabels } from '@/lib/format/time';
import { getOrder, listOrderTickets } from '@/lib/orders/repository';
import { rateLimit } from '@/lib/security/rateLimit';
import { ticketsPdf } from '@/lib/tickets/pdf';
import { getCurrentTenant } from '@/lib/tenant/current';

/** PDF with one page per valid ticket. Only the buyer of the order may download it. */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return new Response('Unauthorized', { status: 401 });
  if (!(await rateLimit(`pdf:${user.uid}`, { limit: 30, windowSeconds: 60 })))
    return new Response('Too many requests', { status: 429 });
  const order = await getOrder(tenant.id, (await params).orderId);
  if (!order || order.buyerUid !== user.uid || order.status !== 'paid')
    return new Response('Not found', { status: 404 });
  const event = await getEvent(tenant.id, order.eventId);
  if (!event) return new Response('Not found', { status: 404 });
  const tickets = (await listOrderTickets(tenant.id, [order.id])).filter((t) => t.status !== 'cancelled');
  const labels =
    event.startAt && event.endAt ? eventDateLabels(event.startAt, event.endAt, event.timezone) : null;
  const pdf = await ticketsPdf(
    tenant.id,
    tenant.branding.name,
    tickets.map((t) => ({
      ticketId: t.id,
      eventTitle: event.title,
      dateLine: labels ? `${labels.long} · ${labels.timeRange}` : 'Date to be announced',
      venueLine: venueLabel(event),
      attendeeName: t.attendeeName,
      ticketTypeName: t.ticketTypeName,
      orderLabel: `Order ${order.id.slice(0, 8).toUpperCase()}`,
    })),
  );
  return new Response(Buffer.from(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="tickets-${order.id.slice(0, 8).toLowerCase()}.pdf"`,
      'cache-control': 'private, no-store',
    },
  });
}
