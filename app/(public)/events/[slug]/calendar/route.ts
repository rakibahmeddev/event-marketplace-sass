import { eventIcs } from '@/lib/events/ics';
import { getPublicEventBySlug } from '@/lib/events/repository';
import { venueLabel } from '@/lib/events/view';
import { getCurrentTenant } from '@/lib/tenant/current';

/** "Add to calendar" — .ics download for a published event. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const tenant = await getCurrentTenant();
  const { slug } = await params;
  const event = tenant ? await getPublicEventBySlug(tenant.id, slug) : null;
  if (!event || !event.startAt || !event.endAt || event.status !== 'published') {
    return new Response('Not found', { status: 404 });
  }
  const url = new URL(`/events/${event.slug}`, request.url).toString();
  const body = eventIcs({
    uid: `${event.id}@${tenant!.id}`,
    title: event.title,
    start: event.startAt,
    end: event.endAt,
    location: venueLabel(event),
    url,
    description: event.description,
  });
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${event.slug}.ics"`,
    },
  });
}
