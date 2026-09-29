import { z } from 'zod';

export const ROLES = ['platform_admin', 'tenant_admin', 'organizer', 'scanner', 'attendee'] as const;
export type Role = (typeof ROLES)[number];

export const claimsSchema = z.object({
  role: z.enum(ROLES),
  tenantId: z.string().min(1),
  organizerId: z.string().min(1).optional(),
});
export type Claims = z.infer<typeof claimsSchema>;

/** Input of the setUserRole callable. Unknown fields are rejected. */
export const setUserRoleInput = z
  .object({
    uid: z.string().min(1).max(128),
    role: z.enum(['attendee', 'organizer']),
    organizerId: z.string().min(1).max(128).optional(),
  })
  .strict()
  .refine((v) => (v.role === 'organizer') === (v.organizerId !== undefined), {
    message: 'organizerId is required for organizers and not allowed otherwise',
    path: ['organizerId'],
  });
export type SetUserRoleInput = z.infer<typeof setUserRoleInput>;

export type Decision =
  | { ok: true; next: Claims }
  | { ok: false; code: 'permission-denied' | 'failed-precondition'; reason: string };

/**
 * Pure authorization for role changes. Tenant admins may move users of their
 * own tenant between attendee and organizer — nothing else. Nobody can grant
 * tenant_admin/platform_admin/scanner here, change their own role, or touch privileged accounts.
 */
export function decideRoleChange(
  actor: { uid: string; claims: Claims | null },
  target: { uid: string; claims: Claims | null },
  input: SetUserRoleInput,
): Decision {
  if (!actor.claims || actor.claims.role !== 'tenant_admin') {
    return { ok: false, code: 'permission-denied', reason: 'Only tenant admins can change roles.' };
  }
  if (actor.uid === target.uid)
    return { ok: false, code: 'permission-denied', reason: 'You cannot change your own role.' };
  if (!target.claims || target.claims.tenantId !== actor.claims.tenantId) {
    // Same message as "not found" so other tenants' users can't be probed.
    return { ok: false, code: 'permission-denied', reason: 'User not found in this marketplace.' };
  }
  if (target.claims.role !== 'attendee' && target.claims.role !== 'organizer') {
    return { ok: false, code: 'failed-precondition', reason: 'This account’s role cannot be changed here.' };
  }
  const next: Claims = { role: input.role, tenantId: actor.claims.tenantId };
  if (input.role === 'organizer') next.organizerId = input.organizerId;
  return { ok: true, next };
}
