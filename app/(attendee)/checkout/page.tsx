import type { Metadata } from 'next';
import Link from 'next/link';
import { faCartShopping } from '@fortawesome/free-solid-svg-icons';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { requireUser } from '@/lib/auth/guards';
import { getEvent } from '@/lib/events/repository';
import { formatMoney } from '@/lib/format/money';
import { listBuyerOrders } from '@/lib/orders/repository';
import { requireTenant } from '@/lib/tenant/current';

export const metadata: Metadata = { title: 'Cart' };

/** Cart = the buyer's active (reserved, unpaid) checkouts. */
export default async function CartPage() {
  const [user, tenant] = await Promise.all([requireUser(), requireTenant()]);
  const now = new Date();
  const active = (await listBuyerOrders(tenant.id, user.uid, 20)).filter(
    (o) => o.status === 'pending' && o.expiresAt && o.expiresAt > now,
  );
  const events = await Promise.all(active.map((o) => getEvent(tenant.id, o.eventId)));
  return (
    <div className="page-container flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="type-h3">Your cart</h1>
      {active.length === 0 ? (
        <EmptyState
          icon={<Icon icon={faCartShopping} />}
          title="Your cart is empty"
          description="Pick tickets on an event page — they’re held for 10 minutes while you check out."
          action={<ButtonLink href="/events">Browse events</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((o, i) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-4 rounded-card border border-line-soft bg-white p-5"
            >
              <div>
                <b className="font-display">{events[i]?.title ?? 'Event'}</b>
                <p className="text-sm text-slate-600">
                  {o.items.reduce((n, it) => n + it.quantity, 0)} tickets · {formatMoney(o.total, o.currency)}
                </p>
              </div>
              <Link href={`/checkout/${o.id}`} className="font-semibold text-primary hover:underline">
                Continue
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
