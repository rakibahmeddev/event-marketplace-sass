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
    'processedWebhookEvents/test_evt1': { orderId: 'o1' },
    'devEmails/e1': { to: 'x@example.test' },
    'somethingElse/x': { a: 1 },
  });
});

describe('server-only collections', () => {
  for (const path of [
    'tenantDomains/demo.localhost',
    'rateLimits/abc',
    'processedWebhookEvents/test_evt1',
    'devEmails/e1',
    'somethingElse/x',
  ]) {
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
