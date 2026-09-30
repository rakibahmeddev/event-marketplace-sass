import { afterAll, beforeAll, describe, it } from 'vitest';
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { as, createEnv, ROLES } from './helpers';

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});

// `as(env, uid, 'organizer')` gives organizerId = `org-${uid}`.
const png = (kb = 10) => new Uint8Array(kb * 1024);
const put = (
  storage: ReturnType<ReturnType<typeof as>['storage']>,
  path: string,
  bytes: Uint8Array,
  contentType = 'image/png',
) =>
  storage
    .ref(path)
    .put(bytes, { contentType })
    .then((s) => s);

describe('event images', () => {
  const path = 'tenants/tA/organizers/org-o1/events/e1/cover.png';

  it('the owning organizer can upload an image', async () => {
    await assertSucceeds(put(as(env, 'o1', 'organizer').storage(), path, png()));
  });

  it('other organizers, roles and tenants cannot', async () => {
    await assertFails(put(as(env, 'o2', 'organizer').storage(), path, png()));
    for (const role of ROLES.filter((r) => r !== 'organizer')) {
      await assertFails(put(as(env, 'o1', role).storage(), path, png()));
    }
    await assertFails(put(as(env, 'o1', 'organizer', 'tB').storage(), path, png()));
    await assertFails(put(env.unauthenticatedContext().storage(), path, png()));
  });

  it('only images up to 5 MB with a safe file name', async () => {
    const s = as(env, 'o1', 'organizer').storage();
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/big.png', png(5 * 1024 + 1)));
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/doc.pdf', png(), 'application/pdf'));
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/page.html', png(), 'text/html'));
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/x.svg', png(), 'image/svg+xml'));
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/sneaky.html', png()));
    await assertSucceeds(put(s, 'tenants/tA/organizers/org-o1/events/e1/photo.webp', png(), 'image/webp'));
  });

  it('no overwrites, deletes, reads or listing from clients', async () => {
    const s = as(env, 'o1', 'organizer').storage();
    await assertSucceeds(put(s, 'tenants/tA/organizers/org-o1/events/e1/once.png', png()));
    await assertFails(put(s, 'tenants/tA/organizers/org-o1/events/e1/once.png', png()));
    await assertFails(s.ref('tenants/tA/organizers/org-o1/events/e1/once.png').delete());
    await assertFails(s.ref('tenants/tA/organizers/org-o1/events/e1/once.png').getDownloadURL());
    await assertFails(s.ref('tenants/tA/organizers/org-o1/events/e1').listAll());
  });
});

describe('logos', () => {
  it('organizers upload their own logo only', async () => {
    await assertSucceeds(
      put(as(env, 'o1', 'organizer').storage(), 'tenants/tA/organizers/org-o1/logo/logo.png', png()),
    );
    await assertFails(
      put(as(env, 'o2', 'organizer').storage(), 'tenants/tA/organizers/org-o1/logo/logo.png', png()),
    );
  });

  it('applicants upload into their own application folder only', async () => {
    await assertSucceeds(
      put(as(env, 'u1', 'attendee').storage(), 'tenants/tA/applications/u1/logo.png', png()),
    );
    await assertFails(
      put(as(env, 'u2', 'attendee').storage(), 'tenants/tA/applications/u1/logo2.png', png()),
    );
    await assertFails(
      put(as(env, 'u1', 'attendee', 'tB').storage(), 'tenants/tA/applications/u1/logo3.png', png()),
    );
  });
});

describe('marketplace branding', () => {
  it('only the tenant admin of that marketplace can upload a logo', async () => {
    await assertSucceeds(put(as(env, 'a1', 'tenant_admin').storage(), 'tenants/tA/branding/logo.png', png()));
    await assertFails(
      put(as(env, 'a2', 'tenant_admin', 'tB').storage(), 'tenants/tA/branding/logo2.png', png()),
    );
    for (const role of ROLES.filter((r) => r !== 'tenant_admin')) {
      await assertFails(put(as(env, `u-${role}`, role).storage(), `tenants/tA/branding/${role}.png`, png()));
    }
    await assertFails(
      put(as(env, 'a1', 'tenant_admin').storage(), 'tenants/tA/branding/x.svg', png(), 'image/svg+xml'),
    );
  });
});

describe('everything else', () => {
  it('is closed', async () => {
    for (const role of ROLES) {
      const s = as(env, 'u1', role).storage();
      await assertFails(put(s, 'tenants/tA/other/logo.png', png()));
      await assertFails(put(s, 'anywhere/file.png', png()));
    }
  });
});
