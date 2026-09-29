import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { tenantAuth } from '@/lib/firebase/admin';
import { getCurrentTenant } from '@/lib/tenant/current';
import { claimsSchema, type Role } from './roles';

/** `__session` is the only cookie Firebase Hosting / App Hosting forwards to the server. */
export const SESSION_COOKIE = '__session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days

export type SessionUser = {
  uid: string;
  email: string | undefined;
  name: string | undefined;
  role: Role;
  tenantId: string;
  organizerId: string | undefined;
  /** e.g. 'password' or 'google.com' — decides whether "change password" applies. */
  signInProvider: string;
};

/**
 * The signed-in user for this request, verified on the server:
 * cookie signature + revocation check, Identity Platform tenant and tenantId claim
 * must both match the tenant resolved from the hostname.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const tenant = await getCurrentTenant();
  if (!tenant) return null;
  try {
    const decoded = await tenantAuth(tenant.authTenantId).verifySessionCookie(cookie, true);
    const claims = claimsSchema.safeParse(decoded);
    if (!claims.success) return null;
    if (decoded.firebase.tenant !== tenant.authTenantId || claims.data.tenantId !== tenant.id) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: typeof decoded.name === 'string' ? decoded.name : undefined,
      role: claims.data.role,
      tenantId: claims.data.tenantId,
      organizerId: claims.data.organizerId,
      signInProvider: decoded.firebase.sign_in_provider,
    };
  } catch {
    return null; // expired, revoked or forged
  }
});
