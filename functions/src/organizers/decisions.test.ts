import { describe, expect, it } from 'vitest';
import { canApprove, canSuspend, claimsAfterSuspend, organizerIdInput } from './decisions';

describe('organizer decisions', () => {
  it('approves pending applicants who are attendees', () => {
    expect(canApprove('pending', { role: 'attendee', tenantId: 't' }, 'o1')).toEqual({ ok: true });
    expect(canApprove('suspended', { role: 'organizer', tenantId: 't', organizerId: 'o1' }, 'o1')).toEqual({
      ok: true,
    });
  });
  it('refuses to approve twice or to overwrite other roles', () => {
    expect(canApprove('approved', { role: 'attendee', tenantId: 't' }, 'o1').ok).toBe(false);
    expect(canApprove('pending', { role: 'tenant_admin', tenantId: 't' }, 'o1').ok).toBe(false);
    expect(canApprove('pending', { role: 'organizer', tenantId: 't', organizerId: 'o2' }, 'o1').ok).toBe(
      false,
    );
    expect(canApprove('pending', null, 'o1').ok).toBe(false);
  });
  it('suspends once and only demotes the matching organizer', () => {
    expect(canSuspend('approved').ok).toBe(true);
    expect(canSuspend('suspended').ok).toBe(false);
    expect(claimsAfterSuspend({ role: 'organizer', tenantId: 't', organizerId: 'o1' }, 'o1', 't')).toEqual({
      role: 'attendee',
      tenantId: 't',
    });
    expect(claimsAfterSuspend({ role: 'tenant_admin', tenantId: 't' }, 'o1', 't')).toBeNull();
  });
  it('validates input strictly', () => {
    expect(organizerIdInput.safeParse({ organizerId: 'o1', status: 'approved' }).success).toBe(false);
  });
});
