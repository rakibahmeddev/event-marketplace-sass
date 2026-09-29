import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { name } = await getCurrentTenantBranding();
  return (
    <>
      <SiteHeader tenantName={name} />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter tenantName={name} />
    </>
  );
}
