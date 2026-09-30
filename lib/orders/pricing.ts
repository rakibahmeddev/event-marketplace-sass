import type { OrderItem } from './schema';

/**
 * Service fee per paid ticket = commissionRate × price, rounded half-up to the minor unit.
 * Free tickets have no fee. The fee is the marketplace's commission (decision 2026-09-30).
 */
export function serviceFeePerTicket(unitPrice: number, commissionRate: number): number {
  if (unitPrice <= 0 || commissionRate <= 0) return 0;
  return Math.round(unitPrice * commissionRate);
}

export function orderTotals(items: Pick<OrderItem, 'unitPrice' | 'quantity'>[], commissionRate: number) {
  let subtotal = 0;
  let fees = 0;
  for (const i of items) {
    subtotal += i.unitPrice * i.quantity;
    fees += serviceFeePerTicket(i.unitPrice, commissionRate) * i.quantity;
  }
  return { subtotal, fees, commission: fees, total: subtotal + fees };
}
