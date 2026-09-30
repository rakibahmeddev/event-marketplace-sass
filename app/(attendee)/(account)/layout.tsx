import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

/** Any signed-in user of this tenant except scanner staff, whose only screens are /scanner. */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role === 'scanner') redirect('/scanner');
  const { name } = await getCurrentTenantBranding();
  return (
    <>
      <SiteHeader tenantName={name} user={user} />
      <main className="min-h-[60vh]">{children}</main>
      <SiteFooter tenantName={name} />
    </>
  );
}
