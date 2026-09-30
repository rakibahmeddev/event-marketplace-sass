import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireTenantActor, type Actor } from '../lib/actor.js';
import { db, isEmulator, tenantAuth } from '../lib/admin.js';
import { writeAudit } from '../lib/audit.js';
import { esc, sendEmail, siteUrl } from '../lib/email.js';
import { EMAIL_FROM, RESEND_API_KEY } from '../lib/secrets.js';
import { createScannerInput, updateScannerInput } from './schema.js';

/** Every event id must belong to the calling organizer. */
async function assertOwnEvents(actor: Actor, eventIds: string[]) {
  const snaps = await db.getAll(...eventIds.map((id) => db.doc(`tenants/${actor.tenant.id}/events/${id}`)));
  if (snaps.some((s) => !s.exists || s.get('organizerId') !== actor.claims.organizerId)) {
    throw new HttpsError('permission-denied', 'You can only assign your own events.');
  }
}

/**
 * Organizer adds check-in staff: dedicated account in the marketplace's user pool, scanner claims,
 * scannerAssignments/{uid}, invitation email with a set-password link, audit log.
 */
export const createScanner = onCall(
  { enforceAppCheck: !isEmulator, secrets: [RESEND_API_KEY] },
  async (request) => {
    const input = createScannerInput.safeParse(request.data);
    if (!input.success)
      throw new HttpsError('invalid-argument', input.error.issues[0]?.message ?? 'Invalid request.');
    const actor = await requireTenantActor(request, 'createScanner', ['organizer'], 20);
    if (!actor.claims.organizerId) throw new HttpsError('permission-denied', 'Organizer profile missing.');
    const { name, email, eventIds } = input.data;
    await assertOwnEvents(actor, eventIds);

    const auth = tenantAuth(actor.tenant.authTenantId);
    if (await auth.getUserByEmail(email).catch(() => null)) {
      throw new HttpsError(
        'already-exists',
        'This email already has an account on this marketplace. Use a separate email for staff.',
      );
    }
    // Random password nobody knows; the staff member sets their own through the invitation link.
    const user = await auth.createUser({
      email,
      displayName: name,
      password: randomBytes(24).toString('base64url'),
    });
    await auth.setCustomUserClaims(user.uid, {
      role: 'scanner',
      tenantId: actor.tenant.id,
      organizerId: actor.claims.organizerId,
    });
    const t = db.doc(`tenants/${actor.tenant.id}`);
    await Promise.all([
      t.collection('scannerAssignments').doc(user.uid).set({
        eventIds,
        organizerId: actor.claims.organizerId,
        name,
        email,
        active: true,
        scanCount: 0,
        lastScanAt: null,
        createdAt: FieldValue.serverTimestamp(),
      }),
      db.doc(`users/${user.uid}`).set({
        tenantId: actor.tenant.id,
        displayName: name,
        email,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
    await writeAudit(actor.tenant.id, {
      actorUid: actor.uid,
      action: 'scanner.create',
      target: { uid: user.uid, events: String(eventIds.length) },
    });

    try {
      const tenantSnap = await t.get();
      const market = (tenantSnap.get('branding.name') as string) ?? 'the marketplace';
      const base = siteUrl(tenantSnap.get('domains'));
      const setPassword = await auth.generatePasswordResetLink(
        email,
        base ? { url: `${base}/scanner/login` } : undefined,
      );
      await sendEmail(
        {
          tenantId: actor.tenant.id,
          to: email,
          subject: `You're invited to scan tickets on ${market}`,
          html: `<p style="font:15px/23px Arial">Hi ${esc(name.split(' ')[0] ?? name)},</p><p style="font:15px/23px Arial">You've been added as check-in staff on ${esc(market)}. Set your password, then open the scanner on your phone.</p><p><a href="${esc(setPassword)}" style="display:inline-block;background:#5B2EE0;color:#fff;text-decoration:none;font:600 15px Arial;padding:14px 22px;border-radius:10px">Set your password</a></p>${base ? `<p style="font:14px Arial">Scanner: <a href="${base}/scanner">${base}/scanner</a></p>` : ''}`,
          text: `You've been added as check-in staff on ${market}. Set your password: ${setPassword}  Then open ${base}/scanner`,
        },
        RESEND_API_KEY.value(),
        EMAIL_FROM.value(),
      );
    } catch (err) {
      console.error('staff invitation email failed', err instanceof Error ? err.message : err);
    }
    return { ok: true, uid: user.uid };
  },
);

/** Organizer changes a staff member's events or turns them off (disables sign-in, revokes sessions). */
export const updateScanner = onCall({ enforceAppCheck: !isEmulator }, async (request) => {
  const input = updateScannerInput.safeParse(request.data);
  if (!input.success) throw new HttpsError('invalid-argument', 'Invalid request.');
  const actor = await requireTenantActor(request, 'updateScanner', ['organizer']);
  const ref = db.doc(`tenants/${actor.tenant.id}/scannerAssignments/${input.data.uid}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get('organizerId') !== actor.claims.organizerId)
    throw new HttpsError('not-found', 'Staff member not found.');

  const update: Record<string, unknown> = {};
  if (input.data.eventIds) {
    await assertOwnEvents(actor, input.data.eventIds);
    update.eventIds = input.data.eventIds;
  }
  if (input.data.active !== undefined) {
    const auth = tenantAuth(actor.tenant.authTenantId);
    await auth.updateUser(input.data.uid, { disabled: !input.data.active });
    if (!input.data.active) await auth.revokeRefreshTokens(input.data.uid);
    update.active = input.data.active;
  }
  await ref.update(update);
  await writeAudit(actor.tenant.id, {
    actorUid: actor.uid,
    action: 'scanner.update',
    target: {
      uid: input.data.uid,
      fields: Object.keys(update).join(', '),
      active: input.data.active === undefined ? null : String(input.data.active),
    },
  });
  return { ok: true };
});
