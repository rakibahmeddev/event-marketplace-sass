import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, ROLES, seed, tenantDoc } from './helpers';

// Sales rollups are read by server code only — not even the marketplace's own admin or organizer reads
// them from the browser, and nobody can write them.
let env: RulesTestEnvironment;

const paths = [
  'tenants/tA/salesDaily/2026-10-01',
  'tenants/tA/organizerSalesDaily/org-u-organizer_2026-10-01',
];

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed(env, {
    'tenants/tA': tenantDoc('A'),
    [paths[0]!]: { date: '2026-10-01', gross: 1000 },
    [paths[1]!]: { date: '2026-10-01', organizerId: 'org-u-organizer', gross: 1000 },
  });
});

describe('sales rollups (same tenant)', () => {
  for (const path of paths) {
    it(`${path} is closed to every role of the tenant`, async () => {
      await assertFails(env.unauthenticatedContext().firestore().doc(path).get());
      for (const role of ROLES) {
        const db = as(env, `u-${role}`, role).firestore();
        await assertFails(db.doc(path).get());
        await assertFails(db.doc(path).set({ gross: 999999 }));
        await assertFails(db.collection(path.split('/').slice(0, 3).join('/')).get());
      }
    });
  }
});
