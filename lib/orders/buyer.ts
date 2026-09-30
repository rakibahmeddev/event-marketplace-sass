import 'server-only';

import { getEvent } from '@/lib/events/repository';
import type { EventRecord } from '@/lib/events/schema';
import { listBuyerOrders, listOrderTickets } from './repository';
import type { Order, Ticket } from './schema';

export type TicketGroup = { event: EventRecord; order: Order; tickets: Ticket[] };

/** The buyer's paid orders with their tickets, grouped per order and split into upcoming / past. */
export async function buyerTicketGroups(tenantId: string, uid: string) {
  const orders = (await listBuyerOrders(tenantId, uid, 100)).filter((o) => o.status === 'paid');
  const tickets = await listOrderTickets(
    tenantId,
    orders.map((o) => o.id),
  );
  const events = new Map<string, EventRecord | null>();
  for (const o of orders)
    if (!events.has(o.eventId)) events.set(o.eventId, await getEvent(tenantId, o.eventId));
  const groups: TicketGroup[] = [];
  for (const o of orders) {
    const event = events.get(o.eventId);
    if (event) groups.push({ event, order: o, tickets: tickets.filter((t) => t.orderId === o.id) });
  }
  const now = new Date();
  const upcoming = groups
    .filter((g) => !g.event.endAt || g.event.endAt > now)
    .sort((a, b) => (a.event.startAt?.getTime() ?? 0) - (b.event.startAt?.getTime() ?? 0));
  const past = groups.filter((g) => g.event.endAt && g.event.endAt <= now);
  return { upcoming, past };
}
