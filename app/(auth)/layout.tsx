import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { getSessionUser } from '@/lib/auth/session';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (await getSessionUser()) redirect('/');
  const { name } = await getCurrentTenantBranding();
  return <AuthSplitLayout tenantName={name}>{children}</AuthSplitLayout>;
}
