import type { Metadata } from 'next';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { requireRole } from '@/lib/auth/guards';
import { storagePaths } from '@/lib/storage/server';
import { requireTenant } from '@/lib/tenant/current';
import { SOCIAL_NETWORKS } from '@/lib/tenant/settings';

export const metadata: Metadata = { title: 'Settings' };

export default async function AdminSettingsPage() {
  const [, tenant] = await Promise.all([requireRole('tenant_admin'), requireTenant()]);
  return (
    <SettingsForm
      authTenantId={tenant.authTenantId}
      logoFolder={storagePaths.brandingLogo(tenant.id)}
      currency={tenant.currency}
      timezone={tenant.timezone}
      initial={{
        name: tenant.branding.name,
        primaryColor: tenant.branding.primaryColor.toUpperCase(),
        accentColor: tenant.branding.accentColor.toUpperCase(),
        logo: tenant.branding.logo
          ? { path: tenant.branding.logo.path, previewUrl: tenant.branding.logo.url }
          : null,
        supportEmail: tenant.supportEmail ?? '',
        footerTagline: tenant.footerTagline,
        socialLinks: Object.fromEntries(
          SOCIAL_NETWORKS.map((n) => [n, tenant.socialLinks[n] ?? '']),
        ) as Record<(typeof SOCIAL_NETWORKS)[number], string>,
        commissionPercent: String(Math.round(tenant.commissionRate * 10_000) / 100),
      }}
    />
  );
}
