import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ticketing',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('Phase 1 baseline: deny by default', () => {
  it('blocks unauthenticated Firestore reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(db.doc('tenants/t1').get());
    await assertFails(db.doc('tenants/t1/events/e1').set({ title: 'x' }));
  });

  it('blocks signed-in users, even with tenant claims', async () => {
    const db = env.authenticatedContext('u1', { role: 'tenant_admin', tenantId: 't1' }).firestore();
    await assertFails(db.doc('tenants/t1').get());
    await assertFails(db.doc('users/u1').set({ displayName: 'x' }));
  });

  it('blocks Storage reads and writes', async () => {
    const storage = env.authenticatedContext('u1', { role: 'organizer', tenantId: 't1' }).storage();
    await assertFails(storage.ref('tenants/t1/logo.png').getDownloadURL());
    await assertFails(
      storage
        .ref('tenants/t1/logo.png')
        .putString('x')
        .then((snap) => snap),
    );
  });
});
