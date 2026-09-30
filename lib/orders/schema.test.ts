import { describe, expect, it } from 'vitest';
import { checkoutDetailsSchema, startCheckoutSchema } from './schema';

describe('startCheckoutSchema', () => {
  it('accepts ids and quantities only', () => {
    expect(
      startCheckoutSchema.safeParse({ eventId: 'e1', items: [{ ticketTypeId: 't1', quantity: 2 }] }).success,
    ).toBe(true);
  });
  it('rejects client prices, totals and extra fields', () => {
    expect(
      startCheckoutSchema.safeParse({ eventId: 'e1', items: [{ ticketTypeId: 't1', quantity: 2, price: 1 }] })
        .success,
    ).toBe(false);
    expect(
      startCheckoutSchema.safeParse({ eventId: 'e1', total: 0, items: [{ ticketTypeId: 't1', quantity: 2 }] })
        .success,
    ).toBe(false);
  });
  it('enforces 8 tickets per order and no duplicates', () => {
    expect(
      startCheckoutSchema.safeParse({
        eventId: 'e1',
        items: [
          { ticketTypeId: 't1', quantity: 5 },
          { ticketTypeId: 't2', quantity: 4 },
        ],
      }).success,
    ).toBe(false);
    expect(
      startCheckoutSchema.safeParse({
        eventId: 'e1',
        items: [
          { ticketTypeId: 't1', quantity: 1 },
          { ticketTypeId: 't1', quantity: 1 },
        ],
      }).success,
    ).toBe(false);
    expect(startCheckoutSchema.safeParse({ eventId: 'e1', items: [] }).success).toBe(false);
  });
});

describe('checkoutDetailsSchema', () => {
  const ok = {
    orderId: 'o1',
    buyerName: 'Jordan',
    buyerEmail: 'j@x.co',
    attendees: [{ name: 'Jordan', email: 'j@x.co' }],
    acceptTerms: true,
  };
  it('requires accepted terms and valid emails', () => {
    expect(checkoutDetailsSchema.safeParse(ok).success).toBe(true);
    expect(checkoutDetailsSchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
    expect(
      checkoutDetailsSchema.safeParse({ ...ok, attendees: [{ name: 'A', email: 'nope' }] }).success,
    ).toBe(false);
  });
});
