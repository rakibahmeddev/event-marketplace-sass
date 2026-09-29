import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { DEFAULT_BRANDING, type TenantBranding } from './branding';
import { getTenantById } from './repository';
import { TENANT_HEADER } from './headers';
import type { Tenant } from './schema';

/** The tenant for this request, or null (unknown host → proxy rewrote to /tenant-not-found). */
export const getCurrentTenant = cache(async (): Promise<Tenant | null> => {
  const tenantId = (await headers()).get(TENANT_HEADER);
  if (!tenantId) return null;
  const tenant = await getTenantById(tenantId);
  return tenant?.status === 'active' ? tenant : null;
});

/** Throws if there is no active tenant — use in routes that only exist inside a marketplace. */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error('No active tenant for this request');
  return tenant;
}

export async function getCurrentTenantBranding(): Promise<TenantBranding> {
  return (await getCurrentTenant())?.branding ?? DEFAULT_BRANDING;
}
