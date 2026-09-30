import { toCsv } from '@/lib/format/csv';
import type { Ticket } from '@/lib/orders/schema';

export { csvCell } from '@/lib/format/csv';

export const ATTENDEE_FILTERS = ['all', 'in', 'out', 'cancelled'] as const;
export type AttendeeFilter = (typeof ATTENDEE_FILTERS)[number];

export function parseAttendeeFilter(v: string | undefined): AttendeeFilter {
  return (ATTENDEE_FILTERS as readonly string[]).includes(v ?? '') ? (v as AttendeeFilter) : 'all';
}

/** Status filter + case-insensitive search over name, email and ticket ID. */
export function filterAttendees(tickets: Ticket[], filter: AttendeeFilter, q: string): Ticket[] {
  const needle = q.trim().toLowerCase();
  return tickets.filter((t) => {
    if (filter === 'in' && t.status !== 'used') return false;
    if (filter === 'out' && t.status !== 'valid') return false;
    if (filter === 'cancelled' && t.status !== 'cancelled') return false;
    if (!needle) return true;
    return (
      t.attendeeName.toLowerCase().includes(needle) ||
      t.attendeeEmail.toLowerCase().includes(needle) ||
      t.id.toLowerCase().includes(needle)
    );
  });
}

/** Cancelled (refunded) tickets don't count towards the total. */
export function attendeeSummary(tickets: Ticket[]) {
  const checkedIn = tickets.filter((t) => t.status === 'used').length;
  const notYet = tickets.filter((t) => t.status === 'valid').length;
  return { checkedIn, notYet, total: checkedIn + notYet };
}

export function attendeesCsv(tickets: Ticket[], formatTime: (d: Date) => string): string {
  const rows = [['Attendee', 'Email', 'Ticket type', 'Ticket ID', 'Order', 'Status', 'Checked in at']];
  for (const t of tickets) {
    rows.push([
      t.attendeeName,
      t.attendeeEmail,
      t.ticketTypeName,
      t.id,
      t.orderId,
      t.status === 'used' ? 'checked in' : t.status === 'valid' ? 'not checked in' : 'cancelled',
      t.checkedInAt ? formatTime(t.checkedInAt) : '',
    ]);
  }
  return toCsv(rows);
}
