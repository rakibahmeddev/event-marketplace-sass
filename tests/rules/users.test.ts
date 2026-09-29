import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, seed } from './helpers';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'users/alice': { tenantId: 'tA', displayName: 'Alice', email: 'alice@example.test' },
    'users/bob': { tenantId: 'tA', displayName: 'Bob', email: 'bob@example.test' },
  });
});

describe('users/{uid}', () => {
  it('a user can read their own profile', async () => {
    await assertSucceeds(as(env, 'alice', 'attendee').firestore().doc('users/alice').get());
  });

  it('a user cannot read someone else’s profile, even in the same tenant', async () => {
    await assertFails(as(env, 'alice', 'attendee').firestore().doc('users/bob').get());
    await assertFails(as(env, 'alice', 'tenant_admin').firestore().doc('users/bob').get());
  });

  it('signed-out visitors cannot read profiles', async () => {
    await assertFails(env.unauthenticatedContext().firestore().doc('users/alice').get());
  });

  it('a user can change their display name', async () => {
    await assertSucceeds(
      as(env, 'alice', 'attendee').firestore().doc('users/alice').update({ displayName: 'Alice L.' }),
    );
  });

  it('display name must be a string of at most 80 characters', async () => {
    const ref = as(env, 'alice', 'attendee').firestore().doc('users/alice');
    await assertFails(ref.update({ displayName: 'x'.repeat(81) }));
    await assertFails(ref.update({ displayName: 42 }));
  });

  it('a user cannot move themselves to another tenant', async () => {
    await assertFails(as(env, 'alice', 'attendee').firestore().doc('users/alice').update({ tenantId: 'tB' }));
  });

  it('role data cannot be smuggled into the profile (claim spoofing)', async () => {
    const ref = as(env, 'alice', 'attendee').firestore().doc('users/alice');
    await assertFails(ref.update({ role: 'tenant_admin' }));
    await assertFails(ref.update({ displayName: 'Alice', role: 'tenant_admin' }));
    await assertFails(ref.update({ organizerId: 'org-1' }));
    await assertFails(ref.update({ email: 'other@example.test' }));
  });

  it('profiles cannot be created or deleted from the client', async () => {
    const db = as(env, 'carol', 'attendee').firestore();
    await assertFails(db.doc('users/carol').set({ tenantId: 'tA', displayName: 'Carol' }));
    await assertFails(as(env, 'alice', 'attendee').firestore().doc('users/alice').delete());
  });

  it('a user cannot overwrite their whole profile with set()', async () => {
    await assertFails(
      as(env, 'alice', 'attendee')
        .firestore()
        .doc('users/alice')
        .set({ tenantId: 'tA', displayName: 'A', role: 'tenant_admin' }),
    );
  });

  it('users cannot list the users collection', async () => {
    await assertFails(as(env, 'alice', 'tenant_admin').firestore().collection('users').get());
  });
});
