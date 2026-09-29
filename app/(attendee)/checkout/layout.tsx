import type { ReactNode } from 'react';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import { requireUser } from '@/lib/auth/guards';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

/** Buying requires an account (tickets are tied to the buyer). */
export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  await requireUser();
  const { name } = await getCurrentTenantBranding();
  return (
    <div className="min-h-dvh bg-mist">
      <CheckoutHeader tenantName={name} step={1} />
      <main>{children}</main>
    </div>
  );
}
