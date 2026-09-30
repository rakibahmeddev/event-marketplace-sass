import { daysBetween } from './days.ts';
import { COUNTER_KEYS, ZERO, type SalesCounters } from './rollup.ts';

export type DailyRow = SalesCounters & { date: string };

export function toCounters(data: Record<string, unknown> | undefined): SalesCounters {
  const out = { ...ZERO };
  for (const k of COUNTER_KEYS) {
    const v = data?.[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function add(a: SalesCounters, b: SalesCounters): SalesCounters {
  const out = { ...a };
  for (const k of COUNTER_KEYS) out[k] += b[k];
  return out;
}

export function sum(rows: SalesCounters[]): SalesCounters {
  return rows.reduce(add, { ...ZERO });
}

/** One row per day from `from` to `to`; days without sales are zero. Rows for the same day are added. */
export function fillDays(rows: DailyRow[], from: string, to: string): DailyRow[] {
  const byDay = new Map<string, SalesCounters>();
  for (const r of rows) byDay.set(r.date, add(byDay.get(r.date) ?? { ...ZERO }, r));
  return daysBetween(from, to).map((date) => ({ date, ...(byDay.get(date) ?? ZERO) }));
}

/** Figures after refunds. */
export function netOf(c: SalesCounters) {
  return {
    gross: c.gross - c.refunds,
    organizerEarnings: c.subtotal - c.refundedSubtotal,
    commission: c.fees - c.refundedFees,
    tickets: c.tickets - c.refundedTickets,
    orders: c.orders - c.refundedOrders,
  };
}

/** Percentage change vs the previous period, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

/** Totals per key (organizer), largest net gross first. */
export function groupTotals<T extends SalesCounters & { key: string }>(rows: T[]) {
  const map = new Map<string, SalesCounters>();
  for (const r of rows) map.set(r.key, add(map.get(r.key) ?? { ...ZERO }, r));
  return [...map.entries()]
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => netOf(b).gross - netOf(a).gross || a.key.localeCompare(b.key));
}
