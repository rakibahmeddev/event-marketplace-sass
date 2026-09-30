import { describe, expect, it } from 'vitest';
import { orderTotals, serviceFeePerTicket } from './pricing';

describe('pricing', () => {
  it('charges commissionRate × price per paid ticket, rounded to the cent', () => {
    expect(serviceFeePerTicket(4500, 0.035)).toBe(158); // 157.5 → 158
    expect(serviceFeePerTicket(1999, 0.035)).toBe(70); // 69.965 → 70
    expect(serviceFeePerTicket(0, 0.035)).toBe(0);
    expect(serviceFeePerTicket(4500, 0)).toBe(0);
  });
  it('totals integer cents with no floating-point drift', () => {
    const t = orderTotals(
      [
        { unitPrice: 4500, quantity: 2 },
        { unitPrice: 0, quantity: 1 },
      ],
      0.035,
    );
    expect(t).toEqual({ subtotal: 9000, fees: 316, commission: 316, total: 9316 });
    for (const v of Object.values(t)) expect(Number.isInteger(v)).toBe(true);
  });
});
