import type { ReactNode } from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getCurrentTenantBranding } from '@/lib/tenant/current';
import { adminNav } from './nav';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { name } = await getCurrentTenantBranding();
  return (
    <DashboardShell
      tenantName={name}
      accountName={name}
      accountRole="Tenant admin"
      title="Admin"
      nav={adminNav}
    >
      {children}
    </DashboardShell>
  );
}
