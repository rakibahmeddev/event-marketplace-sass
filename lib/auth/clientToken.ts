'use server';

import { tenantAuth } from '@/lib/firebase/admin';
import { getSessionUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rateLimit';
import { getCurrentTenant } from '@/lib/tenant/current';

/**
 * Short-lived Firebase custom token for the signed-in user, so the browser can talk to
 * Storage (uploads) and callable functions. The browser keeps no persistent Firebase session;
 * the user's real custom claims come from their account, not from this token.
 */
export async function getClientToken(): Promise<{ token: string } | { error: string }> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return { error: 'Please log in again.' };
  if (!(await rateLimit(`clientToken:${user.uid}`, { limit: 30, windowSeconds: 60 }))) {
    return { error: 'Too many requests. Try again in a minute.' };
  }
  return { token: await tenantAuth(tenant.authTenantId).createCustomToken(user.uid) };
}
