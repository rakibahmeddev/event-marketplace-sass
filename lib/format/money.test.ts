import { describe, expect, it } from 'vitest';
import { centsToInput, formatMoney, parseMoney, priceFromLabel } from './money';

describe('money', () => {
  it('formats cents', () => {
    expect(formatMoney(4500, 'USD')).toBe('$45');
    expect(formatMoney(10118, 'USD')).toBe('$101.18');
    expect(formatMoney(500, 'JPY')).toBe('¥500');
  });
  it('parses user input into cents without floating-point drift', () => {
    expect(parseMoney('45', 'USD')).toBe(4500);
    expect(parseMoney('0.29', 'USD')).toBe(29);
    expect(parseMoney('19.99', 'USD')).toBe(1999);
    expect(parseMoney('1,200.5', 'USD')).toBe(120050);
    expect(parseMoney('500', 'JPY')).toBe(500);
  });
  it('rejects invalid amounts', () => {
    for (const bad of ['', '-1', '1.234', 'abc', '1e3', '12.', '.5'])
      expect(parseMoney(bad, 'USD')).toBeNull();
    expect(parseMoney('5.5', 'JPY')).toBeNull();
  });
  it('round-trips form values', () => {
    expect(centsToInput(1250, 'USD')).toBe('12.50');
    expect(parseMoney(centsToInput(1999, 'USD'), 'USD')).toBe(1999);
  });
  it('labels prices for cards', () => {
    expect(priceFromLabel(0, 'USD')).toBe('Free');
    expect(priceFromLabel(4500, 'USD')).toBe('From $45');
    expect(priceFromLabel(null, 'USD')).toBe('Tickets soon');
  });
});
