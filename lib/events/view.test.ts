import { describe, expect, it } from 'vitest';
import { availability, venueLabel } from './view';

describe('availability', () => {
  it('marks selling fast at 80% and sold out at 100%', () => {
    expect(availability({ totalQuantity: 100, totalSold: 79 })).toBe('available');
    expect(availability({ totalQuantity: 100, totalSold: 80 })).toBe('selling-fast');
    expect(availability({ totalQuantity: 100, totalSold: 100 })).toBe('sold-out');
    expect(availability({ totalQuantity: 0, totalSold: 0 })).toBe('available');
  });
});

describe('venueLabel', () => {
  it('handles online and missing venues', () => {
    const venue = { name: 'Harbor Hall', address: '', city: 'Brooklyn', country: 'US' };
    expect(venueLabel({ isOnline: false, venue })).toBe('Harbor Hall, Brooklyn');
    expect(venueLabel({ isOnline: true, venue })).toBe('Online event');
    expect(venueLabel({ isOnline: false, venue: { name: '', address: '', city: '', country: '' } })).toBe(
      'Venue to be announced',
    );
  });
});
