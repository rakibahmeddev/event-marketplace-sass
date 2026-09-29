import { faLock } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { Stepper } from '@/components/ui/Stepper';

export const CHECKOUT_STEPS = ['Tickets', 'Details & payment', 'Confirmation'];

/** Distraction-free checkout header (design 05). */
export function CheckoutHeader({ tenantName, step }: { tenantName: string; step: number }) {
  return (
    <header className="border-b border-line-soft bg-white">
      <div className="page-container flex h-[60px] items-center justify-between gap-4 md:h-[72px]">
        <Logo name={tenantName} className="max-md:[&>span:first-child]:size-[30px]" />
        <Stepper steps={CHECKOUT_STEPS} current={step} className="hidden md:flex" />
        <span className="flex items-center gap-2 text-sm text-slate-600">
          <Icon icon={faLock} className="text-success" />
          <span className="hidden sm:inline">Secure checkout</span>
        </span>
      </div>
    </header>
  );
}
