import { attendeesCsv } from '@/lib/attendees/view';
import { getSessionUser } from '@/lib/auth/session';
import { getEvent } from '@/lib/events/repository';
import { listEventTickets } from '@/lib/orders/repository';
import { getOrganizer } from '@/lib/organizers/repository';
import { requireTenant } from '@/lib/tenant/current';

/** Attendee list as CSV for the event's own (approved) organizer. */
export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const [{ eventId }, user, tenant] = await Promise.all([params, getSessionUser(), requireTenant()]);
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (user.role !== 'organizer' || !user.organizerId) return new Response('Forbidden', { status: 403 });
  if (!/^[A-Za-z0-9]{1,40}$/.test(eventId)) return new Response('Not found', { status: 404 });

  const [organizer, event] = await Promise.all([
    getOrganizer(tenant.id, user.organizerId),
    getEvent(tenant.id, eventId),
  ]);
  if (!organizer || organizer.ownerUid !== user.uid || organizer.status !== 'approved')
    return new Response('Forbidden', { status: 403 });
  // Another organizer's event looks the same as a missing one.
  if (!event || event.organizerId !== organizer.id) return new Response('Not found', { status: 404 });

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: event.timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const csv = attendeesCsv(await listEventTickets(tenant.id, event.id), (d) => fmt.format(d));
  const name = `attendees-${event.slug || event.id}.csv`.replace(/[^A-Za-z0-9._-]/g, '-');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
