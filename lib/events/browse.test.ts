import { describe, expect, it } from 'vitest';
import { utcToZonedInput, zonedToUtc } from '@/lib/format/time';
import { browseHref, parseBrowseParams, toFilters } from './browse';

const NY = 'America/New_York';

describe('parseBrowseParams', () => {
  it('keeps valid params and drops junk', () => {
    expect(
      parseBrowseParams({
        category: 'music-concerts',
        price: 'free',
        date: 'weekend',
        type: 'nope',
        after: '../x',
        q: ' Jazz ',
      }),
    ).toEqual({ category: 'music-concerts', price: 'free', date: 'weekend', q: 'Jazz' });
  });
  it('takes the first value of repeated params', () => {
    expect(parseBrowseParams({ price: ['paid', 'free'] })).toEqual({ price: 'paid' });
  });
});

describe('toFilters', () => {
  const now = zonedToUtc('2026-10-01', '12:00', NY)!;
  it('maps price, type and a custom day in the marketplace timezone', () => {
    const f = toFilters({ price: 'paid', type: 'online', date: '2026-10-10' }, NY, now);
    expect(f.isFree).toBe(false);
    expect(f.isOnline).toBe(true);
    expect(utcToZonedInput(f.from!, NY)).toEqual({ date: '2026-10-10', time: '00:00' });
    expect(utcToZonedInput(f.to!, NY)).toEqual({ date: '2026-10-11', time: '00:00' });
  });
  it('uses the first keyword for the index and keeps the rest', () => {
    const f = toFilters({ q: 'Rooftop Jazz' }, NY, now);
    expect(f.word).toBe('rooftop');
    expect(f.extraWords).toEqual(['jazz']);
  });
});

describe('browseHref', () => {
  it('changes params and resets pagination', () => {
    expect(browseHref({ category: 'comedy', after: 'abc' }, { price: 'free' })).toBe(
      '/events?category=comedy&price=free',
    );
    expect(browseHref({ category: 'comedy' }, { category: undefined })).toBe('/events');
  });
});
