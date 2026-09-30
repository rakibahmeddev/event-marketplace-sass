import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { CoverImage } from '@/components/ui/CoverImage';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/format/money';
import type { OrderItem } from '@/lib/orders/schema';

type Props = {
  title: string;
  dateLine: string;
  imageUrl?: string | null;
  items: OrderItem[];
  fees: number;
  total: number;
  currency: string;
};

/** Design 05 order summary card (promo codes are deferred; one "Service fee" line). */
export function OrderSummary({ title, dateLine, imageUrl, items, fees, total, currency }: Props) {
  return (
    <aside className="overflow-hidden rounded-card border border-line-soft bg-white lg:sticky lg:top-6">
      <div className="flex gap-3.5 border-b border-line-soft p-5">
        <div className="relative h-[72px] w-24 shrink-0 overflow-hidden rounded-input">
          <CoverImage url={imageUrl} alt="" label="" sizes="96px" />
        </div>
        <div className="flex flex-col gap-1">
          <b className="font-display text-base leading-[22px] font-bold">{title}</b>
          <span className="text-[13px] text-slate-600">{dateLine}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 border-b border-line-soft p-5">
        <b className="font-display text-base font-bold">Order summary</b>
        {items.map((i) => (
          <div key={i.ticketTypeId} className="flex justify-between text-[15px]">
            <span>
              {i.quantity} × {i.name}
            </span>
            <span>{formatMoney(i.unitPrice * i.quantity, currency)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm text-slate-600">
          <span>Service fee</span>
          <span>{formatMoney(fees, currency)}</span>
        </div>
      </div>
      <div className="flex items-baseline justify-between p-5">
        <b className="text-base">Total ({currency})</b>
        <b className="font-display text-[28px] font-extrabold">{formatMoney(total, currency)}</b>
      </div>
      <div className="flex items-center gap-2.5 bg-success-bg px-5 py-3.5 text-[13px] text-success-ink">
        <Icon icon={faShieldHalved} />
        Secure checkout · Tickets by email and in your account
      </div>
    </aside>
  );
}
