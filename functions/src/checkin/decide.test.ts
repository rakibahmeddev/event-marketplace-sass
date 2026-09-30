import { describe, expect, it } from 'vitest';
import { canScan, checkInInput, decideCheckIn } from './decide';

describe('decideCheckIn', () => {
  it('checks in valid tickets once', () => {
    expect(decideCheckIn({ eventId: 'e1', status: 'valid' }, 'e1')).toBe('check_in');
    expect(decideCheckIn({ eventId: 'e1', status: 'used' }, 'e1')).toBe('already_used');
  });
  it('rejects missing, other-event and cancelled tickets', () => {
    expect(decideCheckIn(null, 'e1')).toBe('not_found');
    expect(decideCheckIn({ eventId: 'e2', status: 'valid' }, 'e1')).toBe('wrong_event');
    expect(decideCheckIn({ eventId: 'e1', status: 'cancelled' }, 'e1')).toBe('cancelled');
  });
});

describe('canScan', () => {
  it('allows assigned active scanners and owning organizers only', () => {
    expect(canScan({ role: 'scanner' }, 'o1', { active: true, eventIds: ['e1'] }, 'e1')).toBe(true);
    expect(canScan({ role: 'scanner' }, 'o1', { active: false, eventIds: ['e1'] }, 'e1')).toBe(false);
    expect(canScan({ role: 'scanner' }, 'o1', { active: true, eventIds: ['e2'] }, 'e1')).toBe(false);
    expect(canScan({ role: 'scanner' }, 'o1', null, 'e1')).toBe(false);
    expect(canScan({ role: 'organizer', organizerId: 'o1' }, 'o1', null, 'e1')).toBe(true);
    expect(canScan({ role: 'organizer', organizerId: 'o2' }, 'o1', null, 'e1')).toBe(false);
    for (const role of ['attendee', 'tenant_admin', 'platform_admin'])
      expect(canScan({ role }, 'o1', { active: true, eventIds: ['e1'] }, 'e1')).toBe(false);
  });
});

describe('checkInInput', () => {
  it('accepts a payload or a ticket id, nothing else', () => {
    expect(checkInInput.safeParse({ eventId: 'e1', payload: 'tk1.demo.signature' }).success).toBe(true);
    expect(checkInInput.safeParse({ eventId: 'e1', ticketId: 'tk1' }).success).toBe(true);
    expect(checkInInput.safeParse({ eventId: 'e1', ticketId: 'tk1', status: 'used' }).success).toBe(false);
    expect(checkInInput.safeParse({ eventId: 'e1' }).success).toBe(false);
  });
});
