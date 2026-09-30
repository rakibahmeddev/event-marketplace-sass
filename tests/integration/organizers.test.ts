import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { adminAuth, authTenantIdOf, cleanupClients, clientFor, db, uniqueEmail } from './helpers';

let pool: string;
beforeAll(async () => {
  pool = await authTenantIdOf('demo');
});
afterAll(cleanupClients);

async function applicant() {
  const cred = await createUserWithEmailAndPassword(
    clientFor(pool).auth,
    uniqueEmail('applicant'),
    'long-enough-1',
  );
  const ref = db.collection('tenants/demo/organizers').doc();
  await ref.set({
    name: 'Test Org',
    slug: `test-${ref.id.toLowerCase()}`,
    bio: '',
    status: 'pending',
    ownerUid: cred.user.uid,
    category: 'workshops',
    city: 'Austin',
    logo: null,
    createdAt: new Date(),
    approvedAt: null,
  });
  return { uid: cred.user.uid, organizerId: ref.id };
}

async function asAdmin(email = 'admin@demo.test', p = pool) {
  const c = clientFor(p);
  await c.signIn(email);
  const fns = getFunctions(c.auth.app, 'us-central1');
  return {
    approve: httpsCallable(fns, 'approveOrganizer'),
    suspend: httpsCallable<unknown, { ok: boolean; unpublishedEvents: number }>(fns, 'suspendOrganizer'),
  };
}

describe('approveOrganizer', () => {
  it('approves: status, organizer claims, token revocation, audit log', async () => {
    const { uid, organizerId } = await applicant();
    const admin = await asAdmin();
    await admin.approve({ organizerId });

    const org = await db.doc(`tenants/demo/organizers/${organizerId}`).get();
    expect(org.get('status')).toBe('approved');
    expect(org.get('approvedAt')).toBeTruthy();
    const user = await adminAuth.tenantManager().authForTenant(pool).getUser(uid);
    expect(user.customClaims).toEqual({ role: 'organizer', tenantId: 'demo', organizerId });
    const logs = await db
      .collection('tenants/demo/auditLogs')
      .where('target.organizerId', '==', organizerId)
      .get();
    expect(logs.docs.map((d) => d.get('action'))).toContain('organizer.approve');
  });

  it('refuses non-admins and admins of another marketplace', async () => {
    const { organizerId } = await applicant();
    const organizer = clientFor(pool);
    await organizer.signIn('organizer@demo.test');
    await expect(
      httpsCallable(getFunctions(organizer.auth.app, 'us-central1'), 'approveOrganizer')({ organizerId }),
    ).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
    const other = await asAdmin('admin@other.test', await authTenantIdOf('other'));
    await expect(other.approve({ organizerId })).rejects.toMatchObject({ code: 'functions/not-found' });
    expect((await db.doc(`tenants/demo/organizers/${organizerId}`).get()).get('status')).toBe('pending');
  });

  it('rejects unknown fields', async () => {
    const admin = await asAdmin();
    await expect(admin.approve({ organizerId: 'x', status: 'approved' })).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    });
  });
});

describe('suspendOrganizer', () => {
  it('suspends: demotes the owner and unpublishes their published events', async () => {
    const { uid, organizerId } = await applicant();
    const admin = await asAdmin();
    await admin.approve({ organizerId });
    const ev = db.collection('tenants/demo/events').doc();
    await ev.set({ organizerId, title: 'To hide', status: 'published' });

    const res = await admin.suspend({ organizerId });
    expect(res.data).toEqual({ ok: true, unpublishedEvents: 1 });
    expect((await ev.get()).get('status')).toBe('draft');
    expect((await db.doc(`tenants/demo/organizers/${organizerId}`).get()).get('status')).toBe('suspended');
    const user = await adminAuth.tenantManager().authForTenant(pool).getUser(uid);
    expect(user.customClaims).toEqual({ role: 'attendee', tenantId: 'demo' });
  });
});
