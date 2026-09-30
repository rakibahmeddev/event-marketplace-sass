import { z } from 'zod';
import type { Claims } from '../auth/roleChange.js';

export const organizerIdInput = z.object({ organizerId: z.string().min(1).max(128) }).strict();

type Status = 'pending' | 'approved' | 'suspended';
type Result = { ok: true } | { ok: false; code: 'failed-precondition'; reason: string };

/** Approve: pending/suspended → approved. The owner must be an attendee (or already this organizer). */
export function canApprove(status: Status, ownerClaims: Claims | null, organizerId: string): Result {
  if (status === 'approved') return { ok: false, code: 'failed-precondition', reason: 'Already approved.' };
  if (!ownerClaims)
    return { ok: false, code: 'failed-precondition', reason: 'The applicant account no longer exists.' };
  const isAttendee = ownerClaims.role === 'attendee';
  const isSameOrganizer = ownerClaims.role === 'organizer' && ownerClaims.organizerId === organizerId;
  if (!isAttendee && !isSameOrganizer) {
    return { ok: false, code: 'failed-precondition', reason: 'The applicant already has another role.' };
  }
  return { ok: true };
}

/** Suspend: pending/approved → suspended. */
export function canSuspend(status: Status): Result {
  if (status === 'suspended') return { ok: false, code: 'failed-precondition', reason: 'Already suspended.' };
  return { ok: true };
}

/** Claims after suspension: only demote if the owner currently acts as THIS organizer. */
export function claimsAfterSuspend(
  ownerClaims: Claims | null,
  organizerId: string,
  tenantId: string,
): Claims | null {
  if (ownerClaims?.role === 'organizer' && ownerClaims.organizerId === organizerId)
    return { role: 'attendee', tenantId };
  return null;
}
