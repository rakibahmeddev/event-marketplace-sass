import { describe, expect, it } from 'vitest';
import { formatMoneyCompact } from '../format/money';
import { labelIndexes, niceCeil, yAxis } from './chart';

describe('chart axis', () => {
  it('nice numbers', () => {
    expect(niceCeil(0)).toBe(0);
    expect(niceCeil(0.7)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(2.2)).toBe(2.5);
    expect(niceCeil(31_000)).toBe(50_000);
    expect(niceCeil(100)).toBe(100);
  });

  it('y axis covers the max with 4 equal steps', () => {
    expect(yAxis(380_000)).toEqual({ top: 400_000, ticks: [400_000, 300_000, 200_000, 100_000, 0] });
    expect(yAxis(0).ticks).toEqual([4, 3, 2, 1, 0]);
    const { top } = yAxis(123_456);
    expect(top).toBeGreaterThanOrEqual(123_456);
  });

  it('x labels: evenly spaced, first and last included', () => {
    expect(labelIndexes(30)).toEqual([0, 7, 15, 22, 29]);
    expect(labelIndexes(3)).toEqual([0, 1, 2]);
  });

  it('compact money', () => {
    expect(formatMoneyCompact(420_000, 'USD')).toBe('$4.2K');
    expect(formatMoneyCompact(0, 'USD')).toBe('$0');
  });
});
