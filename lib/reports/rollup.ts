/**
 * Sales counters kept per day (salesDaily, organizerSalesDaily) and per event (eventStats). All money in the
 * smallest currency unit. A sale counts on the day it was paid; a refund counts on the day it was refunded,
 * so "net" for a period = sales − refunds in that period.
 */
export const COUNTER_KEYS = [
  'orders',
  'tickets',
  'gross',
  'subtotal',
  'fees',
  'refundedOrders',
  'refundedTickets',
  'refunds',
  'refundedSubtotal',
  'refundedFees',
] as const;
export type SalesCounters = Record<(typeof COUNTER_KEYS)[number], number>;

export const ZERO: SalesCounters = Object.fromEntries(COUNTER_KEYS.map((k) => [k, 0])) as SalesCounters;

type OrderMoney = { items: { quantity: number }[]; subtotal: number; fees: number; total: number };

const seats = (o: OrderMoney) => o.items.reduce((n, i) => n + i.quantity, 0);

export function saleIncrements(o: OrderMoney): Partial<SalesCounters> {
  return { orders: 1, tickets: seats(o), gross: o.total, subtotal: o.subtotal, fees: o.fees };
}

/** Full refunds only (MVP): everything the buyer paid goes back, service fee included. */
export function refundIncrements(o: OrderMoney): Partial<SalesCounters> {
  return {
    refundedOrders: 1,
    refundedTickets: seats(o),
    refunds: o.total,
    refundedSubtotal: o.subtotal,
    refundedFees: o.fees,
  };
}

/** Doc ids: salesDaily/{day}, organizerSalesDaily/{organizerId}_{day}. */
export const rollupPaths = (tenantId: string, organizerId: string, day: string) => ({
  tenantDay: `tenants/${tenantId}/salesDaily/${day}`,
  organizerDay: `tenants/${tenantId}/organizerSalesDaily/${organizerId}_${day}`,
});
