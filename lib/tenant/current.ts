import 'server-only';

import { DEFAULT_BRANDING, type TenantBranding } from './branding';

/**
 * Phase 1 stub. Phase 2 replaces this with the hostname → tenant lookup done in
 * middleware (cached server read of tenants/{tenantId}).
 */
export async function getCurrentTenantBranding(): Promise<TenantBranding> {
  return DEFAULT_BRANDING;
}
