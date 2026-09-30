import 'server-only';

import type { TicketCardData } from '@/components/tickets/TicketCard';
import type { EventRecord } from '@/lib/events/schema';
import { venueLabel } from '@/lib/events/view';
import type { Ticket } from '@/lib/orders/schema';

export function ticketCardData(
  t: Ticket,
  event: EventRecord,
  tenantName: string,
  footnote: string,
): TicketCardData {
  const tz = event.timezone;
  const date = event.startAt
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(event.startAt)
    : 'TBA';
  const time = event.startAt
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(event.startAt)
    : '';
  return {
    tenantName,
    eventTitle: event.title,
    date,
    time,
    attendeeName: t.attendeeName,
    ticketTypeName: t.ticketTypeName,
    venue: event.isOnline
      ? 'Online event'
      : [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(' · ') ||
        venueLabel(event),
    ticketCode: t.id,
    footnote,
  };
}
