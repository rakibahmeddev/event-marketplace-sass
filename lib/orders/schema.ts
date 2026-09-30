import { z } from 'zod';

export const ORDER_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'expired'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const MAX_TICKETS_PER_ORDER = 8;
export const RESERVATION_MINUTES = 10;

export const orderItemSchema = z.object({
  ticketTypeId: z.string(),
  name: z.string(),
  unitPrice: z.number().int().min(0),
  quantity: z.number().int().min(1),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const attendeeSchema = z.object({ name: z.string(), email: z.string() });
export type Attendee = z.infer<typeof attendeeSchema>;

/** tenants/{t}/orders/{orderId} — written only by server code. */
export const orderDocSchema = z.object({
  buyerUid: z.string(),
  buyerName: z.string().default(''),
  buyerEmail: z.string().default(''),
  eventId: z.string(),
  organizerId: z.string(),
  items: z.array(orderItemSchema),
  attendees: z.array(attendeeSchema).default([]),
  subtotal: z.number().int(),
  /** Service fees paid by the buyer (= the marketplace's commission). */
  fees: z.number().int(),
  commission: z.number().int(),
  total: z.number().int(),
  currency: z.string(),
  status: z.enum(ORDER_STATUSES),
  provider: z.string().default(''),
  paymentRef: z.string().nullable().default(null),
  expiresAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  paidAt: z.date().nullable().default(null),
});
export type OrderDoc = z.infer<typeof orderDocSchema>;
export type Order = OrderDoc & { id: string };

export const TICKET_STATUSES = ['valid', 'used', 'cancelled'] as const;

/** tenants/{t}/tickets/{ticketId} */
export const ticketDocSchema = z.object({
  orderId: z.string(),
  eventId: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string().default(''),
  attendeeName: z.string(),
  attendeeEmail: z.string(),
  status: z.enum(TICKET_STATUSES),
  checkedInAt: z.date().nullable().default(null),
  checkedInBy: z.string().nullable().default(null),
});
export type Ticket = z.infer<typeof ticketDocSchema> & { id: string };

// ---------------------------------------------------------------- inputs

/** Event page → "Get tickets". Only ids and quantities come from the browser; prices are looked up. */
export const startCheckoutSchema = z
  .object({
    eventId: z.string().regex(/^[A-Za-z0-9]{1,40}$/),
    items: z
      .array(
        z
          .object({
            ticketTypeId: z.string().regex(/^[A-Za-z0-9]{1,40}$/),
            quantity: z.number().int().min(1).max(MAX_TICKETS_PER_ORDER),
          })
          .strict(),
      )
      .min(1, 'Choose at least one ticket')
      .max(20),
  })
  .strict()
  .refine(
    (v) => v.items.reduce((n, i) => n + i.quantity, 0) <= MAX_TICKETS_PER_ORDER,
    `At most ${MAX_TICKETS_PER_ORDER} tickets per order`,
  )
  .refine(
    (v) => new Set(v.items.map((i) => i.ticketTypeId)).size === v.items.length,
    'Duplicate ticket type',
  );

const personName = z.string().trim().min(1, 'Enter a name').max(80);
const personEmail = z.email('Enter a valid email').max(254);

/** Checkout page → "Continue to payment". */
export const checkoutDetailsSchema = z
  .object({
    orderId: z.string().regex(/^[A-Za-z0-9]{1,40}$/),
    buyerName: personName,
    buyerEmail: personEmail,
    attendees: z
      .array(z.object({ name: personName, email: personEmail }).strict())
      .min(1)
      .max(MAX_TICKETS_PER_ORDER),
    acceptTerms: z.literal(true, 'Please accept the terms to continue'),
  })
  .strict();
