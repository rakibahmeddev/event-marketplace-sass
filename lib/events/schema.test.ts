import { describe, expect, it } from 'vitest';
import { eventInputSchema, publishRequirements, ticketTypeInputSchema } from './schema';

const base = {
  title: 'Neon Tides Live',
  category: 'music',
  description: '',
  isOnline: false,
  venueName: 'Harbor Hall',
  venueAddress: '210 Kent Ave',
  venueCity: 'Brooklyn',
  venueCountry: 'US',
  timezone: 'America/New_York',
  startDate: '2026-10-03',
  startTime: '20:00',
  endDate: '2026-10-03',
  endTime: '23:30',
  refundPolicy: '',
  imagePaths: [],
  ticketTypes: [],
};

describe('eventInputSchema', () => {
  it('accepts a draft', () => {
    expect(eventInputSchema.safeParse(base).success).toBe(true);
  });
  it('rejects client-supplied server fields (status, sold, organizerId…)', () => {
    for (const extra of [{ status: 'published' }, { totalSold: 0 }, { organizerId: 'x' }, { minPrice: 0 }]) {
      expect(eventInputSchema.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });
  it('rejects unknown timezones', () => {
    expect(eventInputSchema.safeParse({ ...base, timezone: 'Mars/Base' }).success).toBe(false);
  });
});

describe('ticketTypeInputSchema', () => {
  const tt = {
    name: 'GA',
    price: 4500,
    quantity: 100,
    salesStartDate: '',
    salesStartTime: '',
    salesEndDate: '',
    salesEndTime: '',
  };
  it('accepts integer cents', () => {
    expect(ticketTypeInputSchema.safeParse(tt).success).toBe(true);
  });
  it('rejects floats, negatives and sold counts', () => {
    expect(ticketTypeInputSchema.safeParse({ ...tt, price: 45.5 }).success).toBe(false);
    expect(ticketTypeInputSchema.safeParse({ ...tt, price: -1 }).success).toBe(false);
    expect(ticketTypeInputSchema.safeParse({ ...tt, quantity: 0 }).success).toBe(false);
    expect(ticketTypeInputSchema.safeParse({ ...tt, sold: 5 }).success).toBe(false);
  });
});

describe('publishRequirements', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  const ok = {
    title: 'Neon Tides',
    category: 'music',
    imagesCount: 1,
    startAt: new Date('2026-10-04T00:00:00Z'),
    endAt: new Date('2026-10-04T03:30:00Z'),
    isOnline: false,
    venueName: 'Harbor Hall',
    venueCity: 'Brooklyn',
    ticketTypesCount: 1,
    now,
  };
  it('passes a complete event', () => {
    expect(publishRequirements(ok).every((c) => c.ok)).toBe(true);
  });
  it('flags past events, missing venue and inverted times', () => {
    expect(
      publishRequirements({ ...ok, startAt: new Date('2026-09-01T00:00:00Z') }).find((c) => c.key === 'when')
        ?.ok,
    ).toBe(false);
    expect(publishRequirements({ ...ok, venueName: '' }).find((c) => c.key === 'when')?.ok).toBe(false);
    expect(
      publishRequirements({ ...ok, isOnline: true, venueName: '' }).find((c) => c.key === 'when')?.ok,
    ).toBe(true);
    expect(publishRequirements({ ...ok, endAt: ok.startAt }).find((c) => c.key === 'when')?.ok).toBe(false);
  });
});
