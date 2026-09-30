'use client';

import { useMemo, useState } from 'react';
import { faLock, faTicket } from '@fortawesome/free-solid-svg-icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatMoney } from '@/lib/format/money';

export const MAX_PER_ORDER = 8;

export type TicketOption = {
  id: string;
  name: string;
  description: string;
  price: number;
  remaining: number;
  /** null = on sale; otherwise why it can't be bought right now. */
  unavailable: null | 'sold-out' | { startsLabel: string } | 'ended';
};

/**
 * Design 04 ticket panel: quantities, running subtotal. Prices shown are what the organizer set;
 * service fees and the final total are computed on the server at checkout (Phase 4).
 */
export function TicketSelector({
  options,
  currency,
  checkoutOpen,
}: {
  options: TicketOption[];
  currency: string;
  checkoutOpen: boolean;
}) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const subtotal = useMemo(
    () => options.reduce((sum, o) => sum + o.price * (qty[o.id] ?? 0), 0),
    [options, qty],
  );

  const summary = (
    <>
      <div className="flex justify-between text-sm text-slate-600">
        <span>
          {count} ticket{count === 1 ? '' : 's'}
        </span>
        <span>{formatMoney(subtotal, currency)}</span>
      </div>
      <div className="flex justify-between text-sm text-slate-600">
        <span>Service fees</span>
        <span>Calculated at checkout</span>
      </div>
    </>
  );

  return (
    <>
      <aside
        aria-label="Tickets"
        className="overflow-hidden rounded-panel border border-line-soft bg-white shadow-[0_12px_40px_rgb(26_26_46/0.1)] lg:sticky lg:top-24"
      >
        <div className="flex items-baseline justify-between border-b border-line-soft px-6 py-5">
          <h2 className="font-display text-xl font-extrabold">Select tickets</h2>
          <span className="text-[13px] text-slate-500">Max {MAX_PER_ORDER} per order</span>
        </div>
        {options.length === 0 && (
          <p className="px-6 py-5 text-sm text-slate-600">Tickets are not on sale yet.</p>
        )}
        {options.map((o) => {
          const others = count - (qty[o.id] ?? 0);
          const max = Math.min(o.remaining, MAX_PER_ORDER - others);
          return (
            <div key={o.id} className="flex items-center gap-3 border-b border-line-soft px-6 py-[18px]">
              <div className="flex flex-1 flex-col gap-[3px]">
                <b className="font-display text-base font-bold">{o.name}</b>
                <span className="text-base font-bold">
                  {o.price === 0 ? 'Free' : formatMoney(o.price, currency)}
                </span>
                {o.description && <span className="text-[13px] text-slate-600">{o.description}</span>}
                {o.unavailable === null && o.remaining <= 20 && (
                  <span className="text-xs font-bold text-warning-ink">Only {o.remaining} left</span>
                )}
                {o.unavailable && typeof o.unavailable === 'object' && (
                  <span className="text-xs font-semibold text-slate-500">
                    Sales start {o.unavailable.startsLabel}
                  </span>
                )}
                {o.unavailable === 'ended' && (
                  <span className="text-xs font-semibold text-slate-500">Sales ended</span>
                )}
              </div>
              {o.unavailable === 'sold-out' ? (
                <Badge tone="dark">Sold out</Badge>
              ) : o.unavailable === null ? (
                <QuantityStepper
                  label={`${o.name} quantity`}
                  value={qty[o.id] ?? 0}
                  max={Math.max(0, max)}
                  onChange={(v) => setQty((q) => ({ ...q, [o.id]: v }))}
                />
              ) : null}
            </div>
          );
        })}
        <div className="flex flex-col gap-3.5 bg-row-alt px-6 py-5">
          {summary}
          <div className="flex items-baseline justify-between">
            <b className="text-base">Subtotal</b>
            <b className="font-display text-2xl font-extrabold">{formatMoney(subtotal, currency)}</b>
          </div>
          <Button
            size="lg"
            fullWidth
            disabled={!checkoutOpen || count === 0}
            leadingIcon={<Icon icon={faTicket} />}
          >
            {checkoutOpen ? 'Get tickets' : 'Checkout opens soon'}
          </Button>
          <span className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <Icon icon={faLock} />
            Secure checkout · Card payments by Stripe
          </span>
        </div>
      </aside>

      {/* Mobile sticky bar (design 04 · mobile). */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line-soft bg-white px-4 py-3 shadow-[0_-8px_24px_rgb(26_26_46/0.08)] lg:hidden">
          <div className="flex flex-1 flex-col">
            <span className="text-xs text-slate-500">
              {count} ticket{count === 1 ? '' : 's'} · before fees
            </span>
            <b className="font-display text-lg font-extrabold">{formatMoney(subtotal, currency)}</b>
          </div>
          <Button disabled={!checkoutOpen} leadingIcon={<Icon icon={faTicket} />}>
            {checkoutOpen ? 'Get tickets' : 'Opens soon'}
          </Button>
        </div>
      )}
    </>
  );
}
