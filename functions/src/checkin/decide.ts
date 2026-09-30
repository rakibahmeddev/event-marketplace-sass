import { z } from 'zod';

export const checkInInput = z.union([
  z
    .object({ eventId: z.string().regex(/^[A-Za-z0-9]{1,40}$/), payload: z.string().min(10).max(300) })
    .strict(),
  z
    .object({
      eventId: z.string().regex(/^[A-Za-z0-9]{1,40}$/),
      ticketId: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9]{1,40}$/),
    })
    .strict(),
]);
export type CheckInInput = z.infer<typeof checkInInput>;

export type InvalidReason = 'not_a_ticket' | 'other_marketplace' | 'not_found' | 'wrong_event' | 'cancelled';

export type CheckInResult =
  | { result: 'valid'; attendeeName: string; ticketTypeName: string; checkedInAt: string }
  | {
      result: 'already_used';
      attendeeName: string;
      ticketTypeName: string;
      firstCheckedInAt: string | null;
      checkedInByName: string | null;
    }
  | { result: 'invalid'; reason: InvalidReason };

type TicketState = { eventId: string; status: 'valid' | 'used' | 'cancelled' } | null;

/** Pure decision for a scanned ticket (the transaction applies it). */
export function decideCheckIn(
  ticket: TicketState,
  eventId: string,
): 'check_in' | 'already_used' | InvalidReason {
  if (!ticket) return 'not_found';
  if (ticket.eventId !== eventId) return 'wrong_event';
  if (ticket.status === 'cancelled') return 'cancelled';
  if (ticket.status === 'used') return 'already_used';
  return 'check_in';
}

/** Who may scan for an event: an active scanner assigned to it, or the organizer who owns it. */
export function canScan(
  actor: { role: string; organizerId?: string },
  eventOrganizerId: string | null,
  assignment: { active: boolean; eventIds: string[] } | null,
  eventId: string,
): boolean {
  if (actor.role === 'organizer') return !!eventOrganizerId && actor.organizerId === eventOrganizerId;
  if (actor.role === 'scanner')
    return !!assignment && assignment.active && assignment.eventIds.includes(eventId);
  return false;
}
