import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { db, isEmulator, tenantAuth } from '../lib/admin.js';
import { writeAudit } from '../lib/audit.js';
import { rateLimit } from '../lib/rateLimit.js';
import { tenantById } from '../lib/tenants.js';
import { claimsSchema, decideRoleChange, setUserRoleInput } from './roleChange.js';

/**
 * Tenant admin moves a user between attendee and organizer (organizer approval
 * in Phase 3 calls this). Claims change + token revocation + audit log.
 */
export const setUserRole = onCall({ enforceAppCheck: !isEmulator }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const input = setUserRoleInput.safeParse(request.data);
  if (!input.success) throw new HttpsError('invalid-argument', 'Invalid request.');

  const actorClaims = claimsSchema.safeParse(request.auth.token);
  const actor = { uid: request.auth.uid, claims: actorClaims.success ? actorClaims.data : null };
  if (!actor.claims) throw new HttpsError('permission-denied', 'Only tenant admins can change roles.');

  if (!(await rateLimit(`setUserRole:${actor.uid}`, 30, 60))) {
    throw new HttpsError('resource-exhausted', 'Too many requests. Try again in a minute.');
  }

  const tenant = await tenantById(actor.claims.tenantId);
  if (!tenant || tenant.status !== 'active' || request.auth.token.firebase.tenant !== tenant.authTenantId) {
    throw new HttpsError('permission-denied', 'Marketplace unavailable.');
  }

  // Looked up inside the actor's own user pool — users of other tenants are simply not found.
  const auth = tenantAuth(tenant.authTenantId);
  const targetUser = await auth.getUser(input.data.uid).catch(() => null);
  const targetClaims = targetUser ? claimsSchema.safeParse(targetUser.customClaims ?? {}) : null;
  const decision = decideRoleChange(
    actor,
    { uid: input.data.uid, claims: targetClaims?.success ? targetClaims.data : null },
    input.data,
  );
  if (!decision.ok) throw new HttpsError(decision.code, decision.reason);

  if (decision.next.role === 'organizer') {
    const org = await db.doc(`tenants/${tenant.id}/organizers/${decision.next.organizerId}`).get();
    if (!org.exists || org.get('ownerUid') !== input.data.uid || org.get('status') !== 'approved') {
      throw new HttpsError(
        'failed-precondition',
        'Organizer profile must be approved and owned by this user.',
      );
    }
  }

  const previous = targetClaims?.success ? targetClaims.data.role : null;
  await auth.setCustomUserClaims(input.data.uid, decision.next);
  // Existing sessions still carry the old role — force re-authentication.
  await auth.revokeRefreshTokens(input.data.uid);
  await writeAudit(tenant.id, {
    actorUid: actor.uid,
    action: 'role.change',
    target: {
      uid: input.data.uid,
      from: previous,
      to: decision.next.role,
      organizerId: decision.next.organizerId ?? null,
    },
  });

  return { ok: true, role: decision.next.role };
});
