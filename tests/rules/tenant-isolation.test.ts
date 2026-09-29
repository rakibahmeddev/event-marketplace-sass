import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, ROLES, seed, tenantDoc } from './helpers';

// Every role in tenant A must be unable to read or write anything that belongs to tenant B.
let env: RulesTestEnvironment;

const tenantBPaths = [
  'tenants/tB',
  'tenants/tB/auditLogs/log1',
  'tenants/tB/organizers/o1',
  'tenants/tB/events/e1',
  'tenants/tB/events/e1/ticketTypes/tt1',
  'tenants/tB/orders/ord1',
  'tenants/tB/tickets/tk1',
  'tenants/tB/scannerAssignments/u1',
  'users/userB',
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
    'tenants/tB': tenantDoc('B'),
    'tenants/tB/auditLogs/log1': { actorUid: 'x', action: 'role.change', target: {} },
    'tenants/tB/organizers/o1': { name: 'Org B', status: 'approved', ownerUid: 'userB' },
    'tenants/tB/events/e1': { title: 'B event', status: 'published' },
    'tenants/tB/events/e1/ticketTypes/tt1': { name: 'GA', price: 1000 },
    'tenants/tB/orders/ord1': { buyerUid: 'userB', total: 1000 },
    'tenants/tB/tickets/tk1': { orderId: 'ord1', status: 'valid' },
    'tenants/tB/scannerAssignments/u1': { eventIds: ['e1'] },
    'users/userB': { tenantId: 'tB', displayName: 'B user' },
  });
});

describe('tenant isolation: tenant A users cannot touch tenant B', () => {
  for (const role of ROLES) {
    for (const path of tenantBPaths) {
      it(`${role} of tA cannot read or write ${path}`, async () => {
        const db = as(env, `a-${role}`, role).firestore();
        await assertFails(db.doc(path).get());
        await assertFails(db.doc(path).set({ hacked: true }));
        await assertFails(db.doc(path).update({ hacked: true }));
        await assertFails(db.doc(path).delete());
      });
    }
  }

  it('a user with the same uid but tenant A claims cannot read the tenant B profile', async () => {
    const db = as(env, 'userB', 'attendee', 'tA').firestore();
    await assertFails(db.doc('users/userB').get());
    await assertFails(db.doc('users/userB').update({ displayName: 'x' }));
  });

  it('tenant A admins cannot list tenant B audit logs', async () => {
    const db = as(env, 'a-admin', 'tenant_admin').firestore();
    await assertFails(db.collection('tenants/tB/auditLogs').get());
  });
});
