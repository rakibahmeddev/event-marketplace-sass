import 'server-only';

import type { SessionUser } from '@/lib/auth/session';
import { getEvent, listOrganizerEvents } from '@/lib/events/repository';
import type { EventRecord } from '@/lib/events/schema';
import { venueLabel } from '@/lib/events/view';
import { adminDb } from '@/lib/firebase/admin';
import { eventDateLabels } from '@/lib/format/time';

export type ScannerAssignment = { eventIds: string[]; organizerId: string; name: string; active: boolean };

export type ScannableEvent = {
  id: string;
  title: string;
  month: string;
  day: string;
  when: string;
  venue: string;
  live: boolean;
  checkedIn: number;
  ticketsIssued: number;
};

async function getAssignment(tenantId: string, uid: string): Promise<ScannerAssignment | null> {
  const snap = await adminDb().doc(`tenants/${tenantId}/scannerAssignments/${uid}`).get();
  if (!snap.exists) return null;
  return {
    eventIds: (snap.get('eventIds') as string[] | undefined) ?? [],
    organizerId: (snap.get('organizerId') as string | undefined) ?? '',
    name: (snap.get('name') as string | undefined) ?? '',
    active: snap.get('active') !== false,
  };
}

/** Same rule as the checkInTicket function: active assigned scanner, or the organizer owning the event. */
function mayScan(user: SessionUser, event: EventRecord, assignment: ScannerAssignment | null): boolean {
  if (event.status !== 'published') return false;
  if (user.role === 'organizer') return !!user.organizerId && event.organizerId === user.organizerId;
  if (user.role === 'scanner') return !!assignment?.active && assignment.eventIds.includes(event.id);
  return false;
}

async function statsFor(tenantId: string, eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, { checkedIn: number; ticketsIssued: number }>();
  const db = adminDb();
  const snaps = await db.getAll(...eventIds.map((id) => db.doc(`tenants/${tenantId}/eventStats/${id}`)));
  return new Map(
    snaps.map((s) => [
      s.id,
      {
        checkedIn: (s.get('checkedIn') as number | undefined) ?? 0,
        ticketsIssued: (s.get('ticketsIssued') as number | undefined) ?? 0,
      },
    ]),
  );
}

function toScannable(
  e: EventRecord,
  stats: { checkedIn: number; ticketsIssued: number } | undefined,
  now: Date,
): ScannableEvent {
  const labels = e.startAt && e.endAt ? eventDateLabels(e.startAt, e.endAt, e.timezone) : null;
  return {
    id: e.id,
    title: e.title,
    month: labels?.month ?? 'TBA',
    day: labels?.day ?? '–',
    when: labels?.short ?? 'Date to be announced',
    venue: venueLabel(e),
    // Doors usually open before the start time: treat the last 3 hours before start as live.
    live: !!e.startAt && !!e.endAt && now.getTime() >= e.startAt.getTime() - 3 * 3600_000 && now <= e.endAt,
    checkedIn: stats?.checkedIn ?? 0,
    ticketsIssued: stats?.ticketsIssued ?? 0,
  };
}

/** Events the signed-in scanner / organizer can check people in for, soonest first; past events drop off after a day. */
export async function listScannableEvents(
  user: SessionUser,
): Promise<{ events: ScannableEvent[]; staffName: string | null }> {
  const now = new Date();
  let events: EventRecord[];
  let staffName: string | null = null;
  if (user.role === 'scanner') {
    const assignment = await getAssignment(user.tenantId, user.uid);
    staffName = assignment?.name || null;
    if (!assignment?.active) return { events: [], staffName };
    const loaded = await Promise.all(assignment.eventIds.map((id) => getEvent(user.tenantId, id)));
    events = loaded.filter((e): e is EventRecord => !!e && mayScan(user, e, assignment));
  } else if (user.role === 'organizer' && user.organizerId) {
    events = (await listOrganizerEvents(user.tenantId, user.organizerId)).filter((e) =>
      mayScan(user, e, null),
    );
  } else {
    events = [];
  }
  const cutoff = now.getTime() - 24 * 3600_000;
  events = events
    .filter((e) => !e.endAt || e.endAt.getTime() >= cutoff)
    .sort((a, b) => (a.startAt?.getTime() ?? Infinity) - (b.startAt?.getTime() ?? Infinity));
  const stats = await statsFor(
    user.tenantId,
    events.map((e) => e.id),
  );
  return { events: events.map((e) => toScannable(e, stats.get(e.id), now)), staffName };
}

/** One event for the scan screen, or null when this user may not scan it. */
export async function getScannableEvent(
  user: SessionUser,
  eventId: string,
): Promise<{ event: ScannableEvent; staffName: string | null } | null> {
  if (!/^[A-Za-z0-9]{1,40}$/.test(eventId)) return null;
  const [event, assignment] = await Promise.all([
    getEvent(user.tenantId, eventId),
    user.role === 'scanner' ? getAssignment(user.tenantId, user.uid) : Promise.resolve(null),
  ]);
  if (!event || !mayScan(user, event, assignment)) return null;
  const stats = await statsFor(user.tenantId, [event.id]);
  return { event: toScannable(event, stats.get(event.id), new Date()), staffName: assignment?.name || null };
}
