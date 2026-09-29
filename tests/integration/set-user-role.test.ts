import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { adminAuth, authTenantIdOf, cleanupClients, clientFor, db, uniqueEmail } from './helpers';

let demoPool: string;
let otherPool: string;

beforeAll(async () => {
  demoPool = await authTenantIdOf('demo');
  otherPool = await authTenantIdOf('other');
});
afterAll(cleanupClients);

async function newAttendee(pool: string) {
  const cred = await createUserWithEmailAndPassword(
    clientFor(pool).auth,
    uniqueEmail('target'),
    'long-enough-1',
  );
  return cred.user.uid;
}

async function approvedOrganizer(tenantId: string, ownerUid: string) {
  const ref = db.collection(`tenants/${tenantId}/organizers`).doc();
  await ref.set({ name: 'Test Org', slug: ref.id, status: 'approved', ownerUid });
  return ref.id;
}

describe('setUserRole', () => {
  it('a tenant admin promotes an attendee to organizer: claims, revocation, audit log', async () => {
    const uid = await newAttendee(demoPool);
    const organizerId = await approvedOrganizer('demo', uid);
    const admin = clientFor(demoPool);
    await admin.signIn('admin@demo.test');

    const before = Date.now();
    const res = await admin.setUserRole({ uid, role: 'organizer', organizerId });
    expect(res.data).toEqual({ ok: true, role: 'organizer' });

    const user = await adminAuth.tenantManager().authForTenant(demoPool).getUser(uid);
    expect(user.customClaims).toEqual({ role: 'organizer', tenantId: 'demo', organizerId });
    expect(new Date(user.tokensValidAfterTime!).getTime()).toBeGreaterThanOrEqual(
      Math.floor(before / 1000) * 1000,
    );

    const logs = await db.collection('tenants/demo/auditLogs').where('target.uid', '==', uid).get();
    expect(logs.size).toBe(1);
    expect(logs.docs[0]!.data()).toMatchObject({
      action: 'role.change',
      target: { from: 'attendee', to: 'organizer' },
    });
  });

  it('refuses organizer role without an approved organizer profile owned by the user', async () => {
    const uid = await newAttendee(demoPool);
    const someoneElse = await approvedOrganizer('demo', 'another-uid');
    const admin = clientFor(demoPool);
    await admin.signIn('admin@demo.test');
    await expect(
      admin.setUserRole({ uid, role: 'organizer', organizerId: someoneElse }),
    ).rejects.toMatchObject({
      code: 'functions/failed-precondition',
    });
  });

  it('an admin of another marketplace cannot change a demo user', async () => {
    const uid = await newAttendee(demoPool);
    const otherAdmin = clientFor(otherPool);
    await otherAdmin.signIn('admin@other.test');
    await expect(otherAdmin.setUserRole({ uid, role: 'attendee' })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
  });

  it('attendees and organizers cannot change roles', async () => {
    const uid = await newAttendee(demoPool);
    for (const email of ['attendee@demo.test', 'organizer@demo.test', 'scanner@demo.test']) {
      const c = clientFor(demoPool);
      await c.signIn(email);
      await expect(c.setUserRole({ uid, role: 'attendee' })).rejects.toMatchObject({
        code: 'functions/permission-denied',
      });
    }
  });

  it('rejects privileged roles and unknown fields', async () => {
    const uid = await newAttendee(demoPool);
    const admin = clientFor(demoPool);
    await admin.signIn('admin@demo.test');
    await expect(admin.setUserRole({ uid, role: 'tenant_admin' })).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    });
    await expect(
      admin.setUserRole({ uid, role: 'attendee', tenantId: 'other' } as { uid: string; role: string }),
    ).rejects.toMatchObject({ code: 'functions/invalid-argument' });
  });

  it('signed-out callers are rejected', async () => {
    const anon = clientFor(demoPool);
    await expect(anon.setUserRole({ uid: 'x', role: 'attendee' })).rejects.toMatchObject({
      code: 'functions/unauthenticated',
    });
  });
});
