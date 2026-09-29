import type { ReactNode } from 'react';
import { CheckoutHeader } from '@/components/checkout/CheckoutHeader';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export default async function CheckoutLayout({ children }: { children: ReactNode }) {
  const { name } = await getCurrentTenantBranding();
  return (
    <div className="min-h-dvh bg-mist">
      <CheckoutHeader tenantName={name} step={1} />
      <main>{children}</main>
    </div>
  );
}
