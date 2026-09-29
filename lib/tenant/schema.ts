import { z } from 'zod';
import { tenantBrandingSchema } from './branding';

/** Server-side shape of tenants/{tenantId} (fields used so far). */
export const tenantDocSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'suspended']),
  /** Identity Platform tenant that holds this marketplace's user accounts. */
  authTenantId: z.string().min(1),
  branding: tenantBrandingSchema,
});

export type TenantDoc = z.infer<typeof tenantDocSchema>;
export type Tenant = TenantDoc & { id: string };

/** tenantDomains/{hostname} — one doc per hostname guarantees a domain maps to exactly one tenant. */
export const tenantDomainDocSchema = z.object({ tenantId: z.string().min(1) });
