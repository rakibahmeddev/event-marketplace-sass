import { describe, expect, it } from 'vitest';
import { addDays, dayCount, dayKey, daysBetween, isDayKey, resolveRange } from './days';

const TZ = 'America/New_York';

describe('days', () => {
  it('keys instants by the marketplace calendar day', () => {
    // 02:30 UTC on Oct 3 is still Oct 2 in New York.
    expect(dayKey(new Date('2026-10-03T02:30:00Z'), TZ)).toBe('2026-10-02');
    expect(dayKey(new Date('2026-10-03T04:30:00Z'), TZ)).toBe('2026-10-03');
    expect(dayKey(new Date('2026-10-03T02:30:00Z'), 'Asia/Dhaka')).toBe('2026-10-03');
  });

  it('does calendar maths across months, leap years and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
    expect(daysBetween('2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(dayCount('2026-03-07', '2026-03-09')).toBe(3); // US DST starts Mar 8
  });

  it('validates day keys', () => {
    expect(isDayKey('2026-02-28')).toBe(true);
    expect(isDayKey('2026-02-30')).toBe(false);
    expect(isDayKey('26-2-1')).toBe(false);
  });
});

describe('resolveRange', () => {
  const now = new Date('2026-10-15T16:00:00Z');

  it('rolling ranges end today and include it', () => {
    expect(resolveRange({ range: '7d' }, now, TZ)).toMatchObject({
      from: '2026-10-09',
      to: '2026-10-15',
      days: 7,
      prevFrom: '2026-10-02',
      prevTo: '2026-10-08',
    });
  });

  it('this month and last month', () => {
    expect(resolveRange({ range: 'month' }, now, TZ)).toMatchObject({ from: '2026-10-01', to: '2026-10-15' });
    expect(resolveRange({ range: 'last-month' }, now, TZ)).toMatchObject({
      from: '2026-09-01',
      to: '2026-09-30',
      days: 30,
    });
  });

  it('custom: swaps reversed dates, clamps to a year, ignores junk', () => {
    expect(resolveRange({ range: 'custom', from: '2026-10-10', to: '2026-10-01' }, now, TZ)).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-10',
    });
    expect(resolveRange({ range: 'custom', from: '2020-01-01', to: '2026-10-15' }, now, TZ).days).toBe(366);
    expect(resolveRange({ range: 'drop', from: 'x' }, now, TZ)).toMatchObject({ key: '30d', days: 30 });
  });

  it('respects the allowed keys', () => {
    expect(resolveRange({ range: 'custom' }, now, TZ, ['7d', '30d', '90d']).key).toBe('30d');
  });
});
