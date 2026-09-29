import { describe, expect, it } from 'vitest';
import { decideRoleChange, setUserRoleInput, type Claims } from './roleChange';

const admin = (tenantId = 't1'): Claims => ({ role: 'tenant_admin', tenantId });
const attendee = (tenantId = 't1'): Claims => ({ role: 'attendee', tenantId });
const promote = setUserRoleInput.parse({ uid: 'u2', role: 'organizer', organizerId: 'o1' });

describe('setUserRoleInput', () => {
  it('rejects unknown fields', () => {
    expect(setUserRoleInput.safeParse({ uid: 'u2', role: 'attendee', tenantId: 't2' }).success).toBe(false);
  });
  it('rejects privileged roles', () => {
    for (const role of ['tenant_admin', 'platform_admin', 'scanner']) {
      expect(setUserRoleInput.safeParse({ uid: 'u2', role }).success).toBe(false);
    }
  });
  it('requires organizerId only for organizers', () => {
    expect(setUserRoleInput.safeParse({ uid: 'u2', role: 'organizer' }).success).toBe(false);
    expect(setUserRoleInput.safeParse({ uid: 'u2', role: 'attendee', organizerId: 'o1' }).success).toBe(
      false,
    );
  });
});

describe('decideRoleChange', () => {
  it('lets a tenant admin promote an attendee of the same tenant', () => {
    const d = decideRoleChange({ uid: 'u1', claims: admin() }, { uid: 'u2', claims: attendee() }, promote);
    expect(d).toEqual({ ok: true, next: { role: 'organizer', tenantId: 't1', organizerId: 'o1' } });
  });
  it('blocks cross-tenant changes', () => {
    const d = decideRoleChange(
      { uid: 'u1', claims: admin('t1') },
      { uid: 'u2', claims: attendee('t2') },
      promote,
    );
    expect(d.ok).toBe(false);
  });
  it('blocks non-admins', () => {
    for (const role of ['attendee', 'organizer', 'scanner'] as const) {
      const d = decideRoleChange(
        { uid: 'u1', claims: { role, tenantId: 't1' } },
        { uid: 'u2', claims: attendee() },
        promote,
      );
      expect(d.ok).toBe(false);
    }
  });
  it('blocks self-changes', () => {
    expect(decideRoleChange({ uid: 'u1', claims: admin() }, { uid: 'u1', claims: admin() }, promote).ok).toBe(
      false,
    );
  });
  it('refuses to demote other tenant admins or scanners', () => {
    const demote = setUserRoleInput.parse({ uid: 'u2', role: 'attendee' });
    for (const role of ['tenant_admin', 'scanner', 'platform_admin'] as const) {
      const d = decideRoleChange(
        { uid: 'u1', claims: admin() },
        { uid: 'u2', claims: { role, tenantId: 't1' } },
        demote,
      );
      expect(d.ok).toBe(false);
    }
  });
  it('treats users without claims as not found', () => {
    expect(decideRoleChange({ uid: 'u1', claims: admin() }, { uid: 'u2', claims: null }, promote).ok).toBe(
      false,
    );
  });
});
