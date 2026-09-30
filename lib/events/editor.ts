import 'server-only';

import type { EditorValues, TicketRow } from '@/components/dashboard/events/EventEditor';
import { centsToInput } from '@/lib/format/money';
import { utcToZonedInput } from '@/lib/format/time';
import type { EventRecord, TicketType } from './schema';

export function emptyEditorValues(timezone: string): EditorValues {
  return {
    title: '',
    category: '',
    description: '',
    isOnline: false,
    venueName: '',
    venueAddress: '',
    venueCity: '',
    venueCountry: '',
    timezone,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    refundPolicy: '',
    images: [],
    tickets: [],
  };
}

/** Stored event → form values (dates in the event's own timezone, money as decimal strings). */
export function toEditorValues(e: EventRecord, ticketTypes: TicketType[]): EditorValues {
  const start = e.startAt ? utcToZonedInput(e.startAt, e.timezone) : { date: '', time: '' };
  const end = e.endAt ? utcToZonedInput(e.endAt, e.timezone) : { date: '', time: '' };
  const tickets: TicketRow[] = ticketTypes.map((t) => {
    const salesEnd = t.salesEndAt ? utcToZonedInput(t.salesEndAt, e.timezone) : { date: '', time: '' };
    return {
      key: t.id,
      id: t.id,
      name: t.name,
      price: t.price === 0 ? '0' : centsToInput(t.price, t.currency),
      quantity: String(t.quantity),
      salesEndDate: salesEnd.date,
      salesEndTime: salesEnd.time,
      committed: t.sold + t.reserved,
    };
  });
  return {
    title: e.title,
    category: e.category ?? '',
    description: e.description,
    isOnline: e.isOnline,
    venueName: e.venue.name,
    venueAddress: e.venue.address,
    venueCity: e.venue.city,
    venueCountry: e.venue.country,
    timezone: e.timezone,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    refundPolicy: e.refundPolicy,
    images: e.images.map((i) => ({ path: i.path, previewUrl: i.url })),
    tickets,
  };
}

/** IANA zones for the picker, with the marketplace default first. */
export function timezoneOptions(preferred: string, current?: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [preferred];
  return [...new Set([current ?? preferred, preferred, ...all])];
}
