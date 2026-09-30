import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { claimsSchema } from '../auth/roleChange.js';
import { requireTenantActor } from '../lib/actor.js';
import { db, isEmulator, tenantAuth } from '../lib/admin.js';
import { writeAudit } from '../lib/audit.js';
import { canApprove, canSuspend, claimsAfterSuspend, organizerIdInput } from './decisions.js';

async function loadOrganizer(tenantId: string, organizerId: string) {
  const ref = db.doc(`tenants/${tenantId}/organizers/${organizerId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Organizer not found.');
  return {
    ref,
    status: snap.get('status') as 'pending' | 'approved' | 'suspended',
    ownerUid: snap.get('ownerUid') as string,
  };
}

async function ownerClaims(authTenantId: string, uid: string) {
  const user = await tenantAuth(authTenantId)
    .getUser(uid)
    .catch(() => null);
  const parsed = user ? claimsSchema.safeParse(user.customClaims ?? {}) : null;
  return parsed?.success ? parsed.data : null;
}

/** Tenant admin approves an organizer application: status + organizer role/claims + audit log. */
export const approveOrganizer = onCall({ enforceAppCheck: !isEmulator }, async (request) => {
  const input = organizerIdInput.safeParse(request.data);
  if (!input.success) throw new HttpsError('invalid-argument', 'Invalid request.');
  const actor = await requireTenantActor(request, 'approveOrganizer', ['tenant_admin']);
  const { organizerId } = input.data;
  const org = await loadOrganizer(actor.tenant.id, organizerId);
  const claims = await ownerClaims(actor.tenant.authTenantId, org.ownerUid);
  const decision = canApprove(org.status, claims, organizerId);
  if (!decision.ok) throw new HttpsError(decision.code, decision.reason);

  const auth = tenantAuth(actor.tenant.authTenantId);
  await auth.setCustomUserClaims(org.ownerUid, { role: 'organizer', tenantId: actor.tenant.id, organizerId });
  await auth.revokeRefreshTokens(org.ownerUid);
  await org.ref.update({ status: 'approved', approvedAt: FieldValue.serverTimestamp() });
  await writeAudit(actor.tenant.id, {
    actorUid: actor.uid,
    action: 'organizer.approve',
    target: { organizerId, uid: org.ownerUid, from: org.status },
  });
  // Approval email is sent from Phase 4 (email provider).
  return { ok: true };
});

/** Tenant admin suspends an organizer: status, demote owner, unpublish their events, audit log. */
export const suspendOrganizer = onCall({ enforceAppCheck: !isEmulator }, async (request) => {
  const input = organizerIdInput.safeParse(request.data);
  if (!input.success) throw new HttpsError('invalid-argument', 'Invalid request.');
  const actor = await requireTenantActor(request, 'suspendOrganizer', ['tenant_admin']);
  const { organizerId } = input.data;
  const org = await loadOrganizer(actor.tenant.id, organizerId);
  const decision = canSuspend(org.status);
  if (!decision.ok) throw new HttpsError(decision.code, decision.reason);

  const next = claimsAfterSuspend(
    await ownerClaims(actor.tenant.authTenantId, org.ownerUid),
    organizerId,
    actor.tenant.id,
  );
  if (next) {
    const auth = tenantAuth(actor.tenant.authTenantId);
    await auth.setCustomUserClaims(org.ownerUid, next);
    await auth.revokeRefreshTokens(org.ownerUid);
  }

  const published = await db
    .collection(`tenants/${actor.tenant.id}/events`)
    .where('organizerId', '==', organizerId)
    .where('status', '==', 'published')
    .get();
  const writer = db.bulkWriter();
  for (const e of published.docs)
    void writer.update(e.ref, { status: 'draft', updatedAt: FieldValue.serverTimestamp() });
  void writer.update(org.ref, { status: 'suspended' });
  await writer.close();

  await writeAudit(actor.tenant.id, {
    actorUid: actor.uid,
    action: 'organizer.suspend',
    target: { organizerId, uid: org.ownerUid, from: org.status, unpublishedEvents: String(published.size) },
  });
  return { ok: true, unpublishedEvents: published.size };
});
