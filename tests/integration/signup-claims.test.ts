import { afterAll, describe, expect, it } from 'vitest';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { adminAuth, authTenantIdOf, cleanupClients, clientFor, db, uniqueEmail } from './helpers';

afterAll(cleanupClients);

describe('beforeUserCreated', () => {
  it('a sign-up on a marketplace becomes an attendee of that tenant', async () => {
    const authTenantId = await authTenantIdOf('demo');
    const { auth } = clientFor(authTenantId);
    const cred = await createUserWithEmailAndPassword(auth, uniqueEmail('new'), 'long-enough-1');
    const { claims } = await cred.user.getIdTokenResult(true);
    expect(claims.role).toBe('attendee');
    expect(claims.tenantId).toBe('demo');
    expect(claims.organizerId).toBeUndefined();

    const profile = await db.doc(`users/${cred.user.uid}`).get();
    expect(profile.get('tenantId')).toBe('demo');
    expect(profile.get('role')).toBeUndefined(); // roles live only in claims
  });

  it('the same email can have separate accounts on two marketplaces', async () => {
    const email = uniqueEmail('both');
    const a = await createUserWithEmailAndPassword(
      clientFor(await authTenantIdOf('demo')).auth,
      email,
      'long-enough-1',
    );
    const b = await createUserWithEmailAndPassword(
      clientFor(await authTenantIdOf('other')).auth,
      email,
      'long-enough-1',
    );
    expect(a.user.uid).not.toBe(b.user.uid);
    expect((await b.user.getIdTokenResult()).claims.tenantId).toBe('other');
  });

  it('blocks sign-ups in a user pool that has no marketplace', async () => {
    const orphan = await adminAuth.tenantManager().createTenant({
      displayName: `orphan${Date.now() % 100000}`,
      emailSignInConfig: { enabled: true, passwordRequired: true },
    });
    const { auth } = clientFor(orphan.tenantId);
    // The client maps these blocking-function errors to "not accepting sign-ups" (lib/auth/client.ts).
    await expect(
      createUserWithEmailAndPassword(auth, uniqueEmail('orphan'), 'long-enough-1'),
    ).rejects.toThrow(/BLOCKING_FUNCTION|PERMISSION_DENIED/);
  });

  it('blocks sign-ups on a suspended marketplace', async () => {
    const pool = await adminAuth.tenantManager().createTenant({
      displayName: `susp${Date.now() % 100000}`,
      emailSignInConfig: { enabled: true, passwordRequired: true },
    });
    await db.doc(`tenants/suspended-${pool.tenantId}`).set({
      name: 'Suspended',
      status: 'suspended',
      authTenantId: pool.tenantId,
      branding: { name: 'Suspended', primaryColor: '#5B2EE0', accentColor: '#FF6B4A' },
    });
    const { auth } = clientFor(pool.tenantId);
    await expect(createUserWithEmailAndPassword(auth, uniqueEmail('susp'), 'long-enough-1')).rejects.toThrow(
      /BLOCKING_FUNCTION|PERMISSION_DENIED/,
    );
  });
});
