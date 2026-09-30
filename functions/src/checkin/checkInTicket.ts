import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { requireTenantActor } from '../lib/actor.js';
import { db, isEmulator } from '../lib/admin.js';
import { verifyTicketPayload } from '../lib/qr.js';
import { QR_SIGNING_SECRET } from '../lib/secrets.js';
import { canScan, checkInInput, decideCheckIn, type CheckInResult } from './decide.js';

/**
 * Scanner check-in (CLAUDE.md → Tickets and QR check-in):
 * 1. caller is a scanner (or the organizer owning the event) in this tenant
 * 2. QR signature verified (manual ticket-ID entry skips only this step)
 * 3. scanner assigned to the event
 * 4. transaction: valid → used, checkedInAt/checkedInBy, live counter, audit log
 */
export const checkInTicket = onCall(
  { enforceAppCheck: !isEmulator, secrets: [QR_SIGNING_SECRET] },
  async (request): Promise<CheckInResult> => {
    const input = checkInInput.safeParse(request.data);
    if (!input.success) throw new HttpsError('invalid-argument', 'Invalid request.');
    const actor = await requireTenantActor(request, 'scan', ['scanner', 'organizer'], 120); // CLAUDE.md: rate-limit scanning
    const { eventId } = input.data;
    const t = db.doc(`tenants/${actor.tenant.id}`);

    const [eventSnap, assignmentSnap] = await Promise.all([
      t.collection('events').doc(eventId).get(),
      actor.claims.role === 'scanner'
        ? t.collection('scannerAssignments').doc(actor.uid).get()
        : Promise.resolve(null),
    ]);
    const assignment = assignmentSnap?.exists
      ? {
          active: assignmentSnap.get('active') !== false,
          eventIds: (assignmentSnap.get('eventIds') as string[]) ?? [],
        }
      : null;
    if (
      !canScan(
        actor.claims,
        eventSnap.exists ? (eventSnap.get('organizerId') as string) : null,
        assignment,
        eventId,
      )
    ) {
      throw new HttpsError('permission-denied', 'You are not assigned to this event.');
    }

    let ticketId: string;
    if ('payload' in input.data) {
      const ids = verifyTicketPayload(input.data.payload, QR_SIGNING_SECRET.value());
      if (!ids) return { result: 'invalid', reason: 'not_a_ticket' };
      if (ids.tenantId !== actor.tenant.id) return { result: 'invalid', reason: 'other_marketplace' };
      ticketId = ids.ticketId;
    } else {
      ticketId = input.data.ticketId;
    }

    const ticketRef = t.collection('tickets').doc(ticketId);
    const now = Timestamp.now();
    return db.runTransaction(async (tx): Promise<CheckInResult> => {
      const ticket = await tx.get(ticketRef);
      const state = ticket.exists
        ? {
            eventId: ticket.get('eventId') as string,
            status: ticket.get('status') as 'valid' | 'used' | 'cancelled',
          }
        : null;
      const decision = decideCheckIn(state, eventId);
      const attendeeName = (ticket.get('attendeeName') as string) ?? '';
      const ticketTypeName = (ticket.get('ticketTypeName') as string) ?? '';

      if (decision === 'already_used') {
        const byUid = ticket.get('checkedInBy') as string | null;
        const by = byUid ? await tx.get(t.collection('scannerAssignments').doc(byUid)) : null;
        return {
          result: 'already_used',
          attendeeName,
          ticketTypeName,
          firstCheckedInAt: (ticket.get('checkedInAt') as Timestamp | null)?.toDate().toISOString() ?? null,
          checkedInByName: by?.exists
            ? ((by.get('name') as string) ?? null)
            : byUid === actor.uid
              ? 'you'
              : null,
        };
      }
      if (decision !== 'check_in') return { result: 'invalid', reason: decision };

      tx.update(ticketRef, { status: 'used', checkedInAt: now, checkedInBy: actor.uid });
      tx.set(
        t.collection('eventStats').doc(eventId),
        { checkedIn: FieldValue.increment(1) },
        { merge: true },
      );
      if (actor.claims.role === 'scanner') {
        tx.update(t.collection('scannerAssignments').doc(actor.uid), {
          scanCount: FieldValue.increment(1),
          lastScanAt: now,
        });
      }
      tx.create(t.collection('auditLogs').doc(), {
        actorUid: actor.uid,
        action: 'checkin',
        target: { ticketId, eventId },
        createdAt: FieldValue.serverTimestamp(),
      });
      return { result: 'valid', attendeeName, ticketTypeName, checkedInAt: now.toDate().toISOString() };
    });
  },
);
