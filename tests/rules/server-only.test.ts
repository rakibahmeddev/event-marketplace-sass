import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, ROLES, seed } from './helpers';

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
    'tenantDomains/demo.localhost': { tenantId: 'tA' },
    'rateLimits/abc': { count: 1 },
    'somethingElse/x': { a: 1 },
  });
});

describe('server-only collections', () => {
  for (const path of ['tenantDomains/demo.localhost', 'rateLimits/abc', 'somethingElse/x']) {
    it(`${path} is closed to every client`, async () => {
      await assertFails(env.unauthenticatedContext().firestore().doc(path).get());
      for (const role of ROLES) {
        const db = as(env, `u-${role}`, role).firestore();
        await assertFails(db.doc(path).get());
        await assertFails(db.doc(path).set({ tenantId: 'tA' }));
      }
    });
  }

  it('nobody can claim a domain for their tenant', async () => {
    await assertFails(
      as(env, 'admin', 'tenant_admin').firestore().doc('tenantDomains/evil.test').set({ tenantId: 'tA' }),
    );
  });
});

describe('storage (opened in Phase 3)', () => {
  it('blocks reads and writes for every role', async () => {
    for (const role of ROLES) {
      const storage = as(env, `u-${role}`, role).storage();
      await assertFails(storage.ref('tenants/tA/logo.png').getDownloadURL());
      await assertFails(
        storage
          .ref('tenants/tA/logo.png')
          .putString('x')
          .then((snap) => snap),
      );
    }
  });
});
