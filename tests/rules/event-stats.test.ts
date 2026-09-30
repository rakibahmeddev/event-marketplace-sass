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
    'tenants/tB': tenantDoc('B'),
    // as(env, 'o1', 'organizer') → organizerId 'org-o1'
    'tenants/tA/events/e1': { organizerId: 'org-o1', status: 'published' },
    'tenants/tA/events/e2': { organizerId: 'org-o2', status: 'published' },
    'tenants/tA/eventStats/e1': { checkedIn: 3, ticketsIssued: 10 },
    'tenants/tA/eventStats/e2': { checkedIn: 0, ticketsIssued: 5 },
    'tenants/tA/scannerAssignments/s1': { eventIds: ['e1'], organizerId: 'org-o1', active: true },
    'tenants/tA/scannerAssignments/s2': { eventIds: ['e1'], organizerId: 'org-o1', active: false },
    'tenants/tB/eventStats/e1': { checkedIn: 1, ticketsIssued: 1 },
  });
});

describe('eventStats (live check-in counter)', () => {
  it('an assigned, active scanner can read it', async () => {
    await assertSucceeds(as(env, 's1', 'scanner').firestore().doc('tenants/tA/eventStats/e1').get());
  });
  it('the owning organizer can read it', async () => {
    await assertSucceeds(as(env, 'o1', 'organizer').firestore().doc('tenants/tA/eventStats/e1').get());
  });
  it('unassigned or deactivated scanners and other organizers cannot', async () => {
    await assertFails(as(env, 's1', 'scanner').firestore().doc('tenants/tA/eventStats/e2').get());
    await assertFails(as(env, 's2', 'scanner').firestore().doc('tenants/tA/eventStats/e1').get());
    await assertFails(as(env, 's9', 'scanner').firestore().doc('tenants/tA/eventStats/e1').get());
    await assertFails(as(env, 'o2', 'organizer').firestore().doc('tenants/tA/eventStats/e1').get());
  });
  it('other roles and other marketplaces cannot', async () => {
    for (const role of ['attendee', 'tenant_admin', 'platform_admin'] as const) {
      await assertFails(as(env, `u-${role}`, role).firestore().doc('tenants/tA/eventStats/e1').get());
    }
    await assertFails(as(env, 's1', 'scanner', 'tB').firestore().doc('tenants/tA/eventStats/e1').get());
    await assertFails(env.unauthenticatedContext().firestore().doc('tenants/tA/eventStats/e1').get());
  });
  it('nobody can write it from the browser', async () => {
    for (const role of ROLES) {
      await assertFails(
        as(env, 's1', role).firestore().doc('tenants/tA/eventStats/e1').set({ checkedIn: 999 }),
      );
    }
    await assertFails(
      as(env, 'o1', 'organizer').firestore().doc('tenants/tA/eventStats/e1').update({ checkedIn: 0 }),
    );
  });
  it('scanner assignments stay closed, even to the scanner', async () => {
    await assertFails(as(env, 's1', 'scanner').firestore().doc('tenants/tA/scannerAssignments/s1').get());
    await assertFails(
      as(env, 's1', 'scanner')
        .firestore()
        .doc('tenants/tA/scannerAssignments/s1')
        .update({ eventIds: ['e1', 'e2'] }),
    );
  });
});
