import { describe, expect, it } from 'vitest';
import { dateRange, eventDateLabels, startOfZonedDay, utcToZonedInput, zonedToUtc } from './time';

const NY = 'America/New_York';

describe('zonedToUtc', () => {
  it('converts wall-clock time in the event zone to UTC', () => {
    expect(zonedToUtc('2026-10-03', '20:00', NY)?.toISOString()).toBe('2026-10-04T00:00:00.000Z'); // EDT
    expect(zonedToUtc('2026-12-03', '20:00', NY)?.toISOString()).toBe('2026-12-04T01:00:00.000Z'); // EST
    expect(zonedToUtc('2026-10-03', '20:00', 'Asia/Dhaka')?.toISOString()).toBe('2026-10-03T14:00:00.000Z');
  });
  it('handles the DST switch day', () => {
    expect(zonedToUtc('2026-03-08', '12:00', NY)?.toISOString()).toBe('2026-03-08T16:00:00.000Z');
  });
  it('rejects invalid input', () => {
    expect(zonedToUtc('2026-02-31', '10:00', NY)).toBeNull();
    expect(zonedToUtc('2026-10-03', '25:00', NY)).toBeNull();
    expect(zonedToUtc('2026-10-03', '10:00', 'Not/AZone')).toBeNull();
  });
  it('round-trips with utcToZonedInput', () => {
    const d = zonedToUtc('2026-10-17', '12:30', NY)!;
    expect(utcToZonedInput(d, NY)).toEqual({ date: '2026-10-17', time: '12:30' });
  });
});

describe('date filters', () => {
  const thursdayNoon = zonedToUtc('2026-10-01', '12:00', NY)!; // Thu
  it('today ends at local midnight', () => {
    expect(dateRange('today', thursdayNoon, NY).to.toISOString()).toBe(
      zonedToUtc('2026-10-02', '00:00', NY)!.toISOString(),
    );
  });
  it('weekend is Friday 18:00 to Monday 00:00 local', () => {
    const r = dateRange('weekend', thursdayNoon, NY);
    expect(utcToZonedInput(r.from, NY)).toEqual({ date: '2026-10-02', time: '18:00' });
    expect(utcToZonedInput(r.to, NY)).toEqual({ date: '2026-10-05', time: '00:00' });
  });
  it('weekend starts now when it is already Saturday', () => {
    const sat = zonedToUtc('2026-10-03', '15:00', NY)!;
    const r = dateRange('weekend', sat, NY);
    expect(r.from).toEqual(sat);
    expect(utcToZonedInput(r.to, NY)).toEqual({ date: '2026-10-05', time: '00:00' });
  });
  it('startOfZonedDay adds days in local time', () => {
    expect(utcToZonedInput(startOfZonedDay(thursdayNoon, NY, 2), NY)).toEqual({
      date: '2026-10-03',
      time: '00:00',
    });
  });
});

describe('eventDateLabels', () => {
  it('matches the design format', () => {
    const start = zonedToUtc('2026-10-03', '20:00', NY)!;
    const end = zonedToUtc('2026-10-03', '23:30', NY)!;
    const l = eventDateLabels(start, end, NY);
    expect(l.month).toBe('OCT');
    expect(l.day).toBe('03');
    expect(l.short).toBe('Sat, Oct 3 · 8:00 PM');
    expect(l.long).toBe('Saturday, October 3, 2026');
    expect(l.timeRange).toBe('8:00 PM – 11:30 PM EDT');
  });
});
