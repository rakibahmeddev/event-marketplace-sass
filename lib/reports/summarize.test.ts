import { describe, expect, it } from 'vitest';
import { refundIncrements, saleIncrements, ZERO } from './rollup';
import { fillDays, groupTotals, netOf, percentChange, sum, toCounters } from './summarize';

const order = { items: [{ quantity: 2 }, { quantity: 1 }], subtotal: 9000, fees: 315, total: 9315 };

describe('rollups', () => {
  it('sale and refund increments', () => {
    expect(saleIncrements(order)).toEqual({ orders: 1, tickets: 3, gross: 9315, subtotal: 9000, fees: 315 });
    expect(refundIncrements(order)).toEqual({
      refundedOrders: 1,
      refundedTickets: 3,
      refunds: 9315,
      refundedSubtotal: 9000,
      refundedFees: 315,
    });
  });

  it('net figures subtract refunds', () => {
    const c = sum([
      toCounters(saleIncrements(order)),
      toCounters(saleIncrements(order)),
      toCounters(refundIncrements(order)),
    ]);
    expect(netOf(c)).toEqual({
      gross: 9315,
      organizerEarnings: 9000,
      commission: 315,
      tickets: 3,
      orders: 1,
    });
  });

  it('toCounters ignores junk fields and non-numbers', () => {
    expect(toCounters({ gross: 5, date: '2026-10-01', fees: 'x' })).toEqual({ ...ZERO, gross: 5 });
  });

  it('fills missing days with zero and merges same-day rows', () => {
    const rows = fillDays(
      [
        { date: '2026-10-02', ...ZERO, gross: 100 },
        { date: '2026-10-02', ...ZERO, gross: 50 },
        { date: '2026-09-01', ...ZERO, gross: 999 }, // outside the range
      ],
      '2026-10-01',
      '2026-10-03',
    );
    expect(rows.map((r) => [r.date, r.gross])).toEqual([
      ['2026-10-01', 0],
      ['2026-10-02', 150],
      ['2026-10-03', 0],
    ]);
  });

  it('percent change', () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });

  it('groups by key, biggest net gross first', () => {
    const g = groupTotals([
      { key: 'a', ...ZERO, gross: 100 },
      { key: 'b', ...ZERO, gross: 300, refunds: 100 },
      { key: 'a', ...ZERO, gross: 50 },
    ]);
    expect(g.map((x) => [x.key, netOf(x).gross])).toEqual([
      ['b', 200],
      ['a', 150],
    ]);
  });
});
