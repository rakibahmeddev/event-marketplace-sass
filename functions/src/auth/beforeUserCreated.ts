import { FieldValue } from 'firebase-admin/firestore';
import { beforeUserCreated, HttpsError } from 'firebase-functions/v2/identity';
import { db } from '../lib/admin.js';
import { tenantForAuthTenant } from '../lib/tenants.js';

/**
 * Every self-service sign-up (email/password or Google) lands here before the
 * account exists. It must belong to an active marketplace's Identity Platform
 * tenant; the user starts as an attendee of that marketplace.
 * Accounts created with the Admin SDK (seed, scanner staff) do not trigger this.
 */
export const onBeforeUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  const authTenantId = user?.tenantId;
  if (!user || !authTenantId)
    throw new HttpsError('permission-denied', 'Sign-up must happen on a marketplace.');

  const tenant = await tenantForAuthTenant(authTenantId);
  if (!tenant || tenant.status !== 'active') {
    throw new HttpsError('permission-denied', 'This marketplace is not accepting sign-ups.');
  }

  await db
    .collection('users')
    .doc(user.uid)
    .set({
      tenantId: tenant.id,
      displayName: (user.displayName ?? '').slice(0, 80),
      email: user.email ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { customClaims: { role: 'attendee', tenantId: tenant.id } };
});
