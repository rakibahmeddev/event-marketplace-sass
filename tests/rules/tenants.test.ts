import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, ROLES, seed, tenantDoc } from './helpers';

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
    'tenants/tA': tenantDoc('A'),
    'tenants/tA/auditLogs/log1': { actorUid: 'x', action: 'role.change', target: {} },
  });
});

describe('tenants/{tenantId}', () => {
  it('tenant_admin of the tenant can read it', async () => {
    await assertSucceeds(as(env, 'admin', 'tenant_admin').firestore().doc('tenants/tA').get());
  });

  for (const role of ROLES.filter((r) => r !== 'tenant_admin')) {
    it(`${role} cannot read it`, async () => {
      await assertFails(as(env, `u-${role}`, role).firestore().doc('tenants/tA').get());
    });
  }

  it('signed-out visitors cannot read it', async () => {
    await assertFails(env.unauthenticatedContext().firestore().doc('tenants/tA').get());
  });

  for (const role of ROLES) {
    it(`${role} cannot change commission, status or branding`, async () => {
      const ref = as(env, `u-${role}`, role).firestore().doc('tenants/tA');
      await assertFails(ref.update({ commissionRate: 0 }));
      await assertFails(ref.update({ status: 'active' }));
      await assertFails(ref.update({ 'branding.primaryColor': '#000000' }));
      await assertFails(ref.delete());
    });
  }

  it('nobody can create a tenant from the client', async () => {
    await assertFails(
      as(env, 'admin', 'tenant_admin', 'tNew').firestore().doc('tenants/tNew').set(tenantDoc('New')),
    );
  });
});

describe('tenants/{tenantId}/auditLogs', () => {
  it('tenant_admin can read the log', async () => {
    await assertSucceeds(
      as(env, 'admin', 'tenant_admin').firestore().collection('tenants/tA/auditLogs').get(),
    );
  });

  for (const role of ROLES.filter((r) => r !== 'tenant_admin')) {
    it(`${role} cannot read the log`, async () => {
      await assertFails(as(env, `u-${role}`, role).firestore().doc('tenants/tA/auditLogs/log1').get());
    });
  }

  it('the log is append-only from the server (no client writes, even by admins)', async () => {
    const db = as(env, 'admin', 'tenant_admin').firestore();
    await assertFails(
      db.collection('tenants/tA/auditLogs').add({ actorUid: 'admin', action: 'role.change' }),
    );
    await assertFails(db.doc('tenants/tA/auditLogs/log1').update({ action: 'nothing' }));
    await assertFails(db.doc('tenants/tA/auditLogs/log1').delete());
  });
});

describe('not yet opened (Phase 3+)', () => {
  for (const path of [
    'tenants/tA/events/e1',
    'tenants/tA/organizers/o1',
    'tenants/tA/orders/x',
    'tenants/tA/tickets/x',
  ]) {
    it(`${path} stays closed for every role`, async () => {
      for (const role of ROLES) {
        await assertFails(as(env, `u-${role}`, role).firestore().doc(path).get());
      }
    });
  }
});
