import { z } from 'zod';
import { isValidTimeZone } from '@/lib/format/time';
import { imageRefSchema } from '@/lib/organizers/schema';

export const EVENT_STATUSES = ['draft', 'published', 'cancelled'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const venueSchema = z.object({
  name: z.string(),
  address: z.string(),
  city: z.string(),
  country: z.string(),
});
export type Venue = z.infer<typeof venueSchema>;

/** tenants/{t}/events/{eventId} — as stored (Timestamps converted to Date by the repository). */
export const eventDocSchema = z.object({
  organizerId: z.string(),
  title: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  description: z.string(),
  images: z.array(imageRefSchema),
  venue: venueSchema,
  isOnline: z.boolean(),
  timezone: z.string(),
  refundPolicy: z.string(),
  startAt: z.date().nullable(),
  endAt: z.date().nullable(),
  status: z.enum(EVENT_STATUSES),
  publishedAt: z.date().nullable(),
  // Denormalised for cards, filters and badges (kept in sync by server code).
  organizerName: z.string(),
  organizerSlug: z.string(),
  city: z.string(),
  currency: z.string(),
  minPrice: z.number().int().nullable(),
  isFree: z.boolean(),
  totalQuantity: z.number().int(),
  totalSold: z.number().int(),
  searchWords: z.array(z.string()),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});
export type EventDoc = z.infer<typeof eventDocSchema>;
export type EventRecord = EventDoc & { id: string };

/** tenants/{t}/events/{eventId}/ticketTypes/{ticketTypeId} */
export const ticketTypeDocSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  price: z.number().int().min(0),
  currency: z.string(),
  quantity: z.number().int().min(0),
  sold: z.number().int().min(0),
  reserved: z.number().int().min(0),
  salesStartAt: z.date().nullable(),
  salesEndAt: z.date().nullable(),
  order: z.number().int(),
});
export type TicketType = z.infer<typeof ticketTypeDocSchema> & { id: string };

// ---------------------------------------------------------------- form input

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date');
const timeStr = z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time');
const optionalDate = z.union([dateStr, z.literal('')]);
const optionalTime = z.union([timeStr, z.literal('')]);

export const ticketTypeInputSchema = z
  .object({
    /** Existing ticket type id, or absent for a new one. */
    id: z.string().max(64).optional(),
    name: z.string().trim().min(1, 'Name the ticket').max(60),
    description: z.string().trim().max(200).default(''),
    /** Minor units, parsed from the form by the client and re-validated here. */
    price: z.number().int('Invalid price').min(0).max(10_000_000),
    quantity: z.number().int('Whole numbers only').min(1, 'At least 1').max(100_000),
    salesStartDate: optionalDate,
    salesStartTime: optionalTime,
    salesEndDate: optionalDate,
    salesEndTime: optionalTime,
  })
  .strict();
export type TicketTypeInput = z.infer<typeof ticketTypeInputSchema>;

/**
 * Create / edit event form. Drafts may be incomplete; `publishRequirements` checks the rest.
 */
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(3, 'Give your event a title').max(120),
    category: z.string().max(64).nullable(),
    description: z.string().trim().max(8000),
    isOnline: z.boolean(),
    venueName: z.string().trim().max(120),
    venueAddress: z.string().trim().max(200),
    venueCity: z.string().trim().max(80),
    venueCountry: z.string().trim().max(80),
    timezone: z.string().refine(isValidTimeZone, 'Unknown timezone'),
    startDate: optionalDate,
    startTime: optionalTime,
    endDate: optionalDate,
    endTime: optionalTime,
    refundPolicy: z.string().trim().max(2000),
    imagePaths: z.array(z.string().max(300)).max(6),
    ticketTypes: z.array(ticketTypeInputSchema).max(20),
  })
  .strict();
export type EventInput = z.infer<typeof eventInputSchema>;

export type PublishCheck = { key: string; label: string; ok: boolean };

/** Checklist shown in the editor (design: "Checklist") and enforced on publish. */
export function publishRequirements(e: {
  title: string;
  category: string | null;
  imagesCount: number;
  startAt: Date | null;
  endAt: Date | null;
  isOnline: boolean;
  venueName: string;
  venueCity: string;
  ticketTypesCount: number;
  now: Date;
}): PublishCheck[] {
  return [
    { key: 'title', label: 'Title & category', ok: e.title.length >= 3 && !!e.category },
    { key: 'image', label: 'Cover image', ok: e.imagesCount > 0 },
    {
      key: 'when',
      label: 'Date & venue',
      ok:
        !!e.startAt &&
        !!e.endAt &&
        e.endAt > e.startAt &&
        e.startAt > e.now &&
        (e.isOnline || (e.venueName.length > 0 && e.venueCity.length > 0)),
    },
    { key: 'tickets', label: 'At least one ticket type', ok: e.ticketTypesCount > 0 },
  ];
}
