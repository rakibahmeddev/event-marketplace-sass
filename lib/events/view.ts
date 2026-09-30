import type { EventCardData } from '@/components/events/EventCard';
import { priceFromLabel } from '@/lib/format/money';
import { eventDateLabels } from '@/lib/format/time';
import type { Category } from '@/lib/categories/schema';
import type { EventRecord } from './schema';

export type Availability = 'available' | 'selling-fast' | 'sold-out';

export function availability(e: Pick<EventRecord, 'totalQuantity' | 'totalSold'>): Availability {
  if (e.totalQuantity > 0 && e.totalSold >= e.totalQuantity) return 'sold-out';
  if (e.totalQuantity > 0 && e.totalSold / e.totalQuantity >= 0.8) return 'selling-fast';
  return 'available';
}

export function venueLabel(e: Pick<EventRecord, 'isOnline' | 'venue'>): string {
  if (e.isOnline) return 'Online event';
  return [e.venue.name, e.venue.city].filter(Boolean).join(', ') || 'Venue to be announced';
}

export function toEventCard(e: EventRecord, categories: Map<string, Category>): EventCardData {
  const labels = e.startAt && e.endAt ? eventDateLabels(e.startAt, e.endAt, e.timezone) : null;
  const a = availability(e);
  return {
    href: `/events/${e.slug}`,
    title: e.title,
    category: (e.category && categories.get(e.category)?.name) || 'Event',
    month: labels?.month ?? 'TBA',
    day: labels?.day ?? '–',
    when: labels?.short ?? 'Date to be announced',
    venue: venueLabel(e),
    priceLabel: priceFromLabel(e.minPrice, e.currency),
    organizerName: e.organizerName,
    status: a === 'available' ? undefined : a,
    imageLabel: 'event image',
    imageUrl: e.images[0]?.url ?? null,
  };
}
