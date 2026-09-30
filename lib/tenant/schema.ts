import { z } from 'zod';
import { tenantBrandingSchema } from './branding';
import { socialLinksSchema } from './settings';

/** Server-side shape of tenants/{tenantId} (fields used so far). */
export const tenantDocSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['active', 'suspended']),
  /** Identity Platform tenant that holds this marketplace's user accounts. */
  authTenantId: z.string().min(1),
  branding: tenantBrandingSchema,
  /** IANA zone used for "today / this weekend" filters and as the default for new events. */
  timezone: z.string().min(1).default('America/New_York'),
  /** ISO 4217; all prices on this marketplace use it. */
  currency: z.string().length(3).default('USD'),
  /** Decimal share, e.g. 0.035. Server-side only; shown on the organizer pricing page. */
  commissionRate: z.number().min(0).max(1).default(0),
  supportEmail: z.email().optional(),
  footerTagline: z.string().default(''),
  socialLinks: socialLinksSchema.default({}),
});

export type TenantDoc = z.infer<typeof tenantDocSchema>;
export type Tenant = TenantDoc & { id: string };

/** tenantDomains/{hostname} — one doc per hostname guarantees a domain maps to exactly one tenant. */
export const tenantDomainDocSchema = z.object({ tenantId: z.string().min(1) });
