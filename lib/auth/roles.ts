import { z } from 'zod';

export const ROLES = ['platform_admin', 'tenant_admin', 'organizer', 'scanner', 'attendee'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** Custom claims set by Cloud Functions only: { role, tenantId, organizerId? }. */
export const claimsSchema = z.object({
  role: roleSchema,
  tenantId: z.string().min(1),
  organizerId: z.string().min(1).optional(),
});
export type Claims = z.infer<typeof claimsSchema>;
