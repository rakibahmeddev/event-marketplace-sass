import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { getSessionUser } from '@/lib/auth/session';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [{ name }, user] = await Promise.all([getCurrentTenantBranding(), getSessionUser()]);
  return (
    <>
      <SiteHeader tenantName={name} user={user} />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter tenantName={name} />
    </>
  );
}
