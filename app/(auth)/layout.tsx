import type { ReactNode } from 'react';
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout';
import { getCurrentTenantBranding } from '@/lib/tenant/current';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const { name } = await getCurrentTenantBranding();
  return <AuthSplitLayout tenantName={name}>{children}</AuthSplitLayout>;
}
