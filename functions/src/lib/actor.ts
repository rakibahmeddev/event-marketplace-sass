import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { claimsSchema, type Claims } from '../auth/roleChange.js';
import { rateLimit } from './rateLimit.js';
import { tenantById, type TenantRef } from './tenants.js';

export type Actor = { uid: string; claims: Claims; tenant: TenantRef };

/**
 * Common checks for tenant-admin callables: signed in, valid claims, active tenant whose
 * Identity Platform pool matches the caller's token, role allowed, rate limit.
 */
export async function requireTenantActor(
  request: CallableRequest,
  name: string,
  roles: Claims['role'][],
): Promise<Actor> {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const claims = claimsSchema.safeParse(request.auth.token);
  if (!claims.success || !roles.includes(claims.data.role)) {
    throw new HttpsError('permission-denied', 'You are not allowed to do this.');
  }
  if (!(await rateLimit(`${name}:${request.auth.uid}`, 30, 60))) {
    throw new HttpsError('resource-exhausted', 'Too many requests. Try again in a minute.');
  }
  const tenant = await tenantById(claims.data.tenantId);
  if (!tenant || tenant.status !== 'active' || request.auth.token.firebase.tenant !== tenant.authTenantId) {
    throw new HttpsError('permission-denied', 'Marketplace unavailable.');
  }
  return { uid: request.auth.uid, claims: claims.data, tenant };
}
