import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signTicketPayload } from '../../lib/tickets/qr-core';
import {
  adminAuth,
  authTenantIdOf,
  cleanupClients,
  clientFor,
  db,
  SEED_PASSWORD,
  uniqueEmail,
} from './helpers';

// The functions emulator reads QR_SIGNING_SECRET from functions/.secret.local; sign test QR codes with the same one.
const SECRET =
  /^QR_SIGNING_SECRET=(.+)$/m.exec(readFileSync('functions/.secret.local', 'utf8'))?.[1]?.trim() ?? '';

const EVENT = 'seed0000000001'; // scanner@demo.test is assigned to 1 and 2
const EVENT_2 = 'seed0000000002';
const UNASSIGNED = 'seed0000000003';

type Result = {
  result: string;
  reason?: string;
  attendeeName?: string;
  firstCheckedInAt?: string | null;
  checkedInByName?: string | null;
};

let pool: string;
beforeAll(async () => {
  expect(SECRET.length).toBeGreaterThanOrEqual(32);
  pool = await authTenantIdOf('demo');
});
afterAll(cleanupClients);

async function as(email: string, password = SEED_PASSWORD) {
  const c = clientFor(pool);
  const cred = await c.signIn(email, password);
  const fns = getFunctions(c.auth.app, 'us-central1');
  return {
    uid: cred.user.uid,
    checkIn: async (data: unknown) => (await httpsCallable<unknown, Result>(fns, 'checkInTicket')(data)).data,
    createScanner: httpsCallable<unknown, { ok: boolean; uid: string }>(fns, 'createScanner'),
    updateScanner: httpsCallable<unknown, { ok: boolean }>(fns, 'updateScanner'),
  };
}

async function ticket(eventId = EVENT, status: 'valid' | 'used' | 'cancelled' = 'valid') {
  const ref = db.collection('tenants/demo/tickets').doc();
  await ref.set({
    orderId: 'test-order',
    eventId,
    ticketTypeId: 'tt2',
    ticketTypeName: 'General Admission',
    attendeeName: 'Test Person',
    attendeeEmail: 'test.person@example.com',
    status,
    checkedInAt: null,
    checkedInBy: null,
  });
  return ref.id;
}

const qr = (ticketId: string, tenantId = 'demo') => signTicketPayload(ticketId, tenantId, SECRET);
const stats = async (eventId = EVENT) =>
  ((await db.doc(`tenants/demo/eventStats/${eventId}`).get()).get('checkedIn') as number | undefined) ?? 0;

describe('checkInTicket', () => {
  it('valid → used, then already used; counter, scan count and audit log', async () => {
    const scanner = await as('scanner@demo.test');
    const id = await ticket();
    const before = await stats();
    const scansBefore = (await db.doc(`tenants/demo/scannerAssignments/${scanner.uid}`).get()).get(
      'scanCount',
    ) as number;

    const first = await scanner.checkIn({ eventId: EVENT, payload: qr(id) });
    expect(first).toMatchObject({
      result: 'valid',
      attendeeName: 'Test Person',
      ticketTypeName: 'General Admission',
    });

    const t = await db.doc(`tenants/demo/tickets/${id}`).get();
    expect(t.get('status')).toBe('used');
    expect(t.get('checkedInBy')).toBe(scanner.uid);
    expect(t.get('checkedInAt')).toBeTruthy();
    expect(await stats()).toBe(before + 1);
    const a = await db.doc(`tenants/demo/scannerAssignments/${scanner.uid}`).get();
    expect(a.get('scanCount')).toBe(scansBefore + 1);
    expect(a.get('lastScanAt')).toBeTruthy();
    const logs = await db.collection('tenants/demo/auditLogs').where('target.ticketId', '==', id).get();
    expect(logs.docs.map((d) => d.get('action'))).toEqual(['checkin']);

    const second = await scanner.checkIn({ eventId: EVENT, payload: qr(id) });
    expect(second).toMatchObject({ result: 'already_used', checkedInByName: 'Tasha Green' });
    expect(second.firstCheckedInAt).toBeTruthy();
    expect(await stats()).toBe(before + 1);
  });

  it('manual ticket ID entry checks in without a QR', async () => {
    const scanner = await as('scanner@demo.test');
    const id = await ticket();
    expect(await scanner.checkIn({ eventId: EVENT, ticketId: id })).toMatchObject({ result: 'valid' });
  });

  it('rejects tampered, foreign, wrong-event, cancelled and unknown tickets', async () => {
    const scanner = await as('scanner@demo.test');
    const id = await ticket();
    const payload = qr(id);
    const tampered = payload.slice(0, -2) + (payload.endsWith('AA') ? 'BB' : 'AA');
    expect(await scanner.checkIn({ eventId: EVENT, payload: tampered })).toEqual({
      result: 'invalid',
      reason: 'not_a_ticket',
    });
    // Signature swapped onto another ticket id.
    const other = await ticket();
    const forged = `${other}.demo.${payload.split('.')[2]}`;
    expect(await scanner.checkIn({ eventId: EVENT, payload: forged })).toEqual({
      result: 'invalid',
      reason: 'not_a_ticket',
    });
    expect(await scanner.checkIn({ eventId: EVENT, payload: qr(id, 'other') })).toEqual({
      result: 'invalid',
      reason: 'other_marketplace',
    });
    expect(await scanner.checkIn({ eventId: EVENT, payload: qr(await ticket(EVENT_2)) })).toEqual({
      result: 'invalid',
      reason: 'wrong_event',
    });
    expect(await scanner.checkIn({ eventId: EVENT, payload: qr(await ticket(EVENT, 'cancelled')) })).toEqual({
      result: 'invalid',
      reason: 'cancelled',
    });
    expect(await scanner.checkIn({ eventId: EVENT, ticketId: 'doesNotExist123' })).toEqual({
      result: 'invalid',
      reason: 'not_found',
    });
    // Nothing above was checked in.
    expect((await db.doc(`tenants/demo/tickets/${id}`).get()).get('status')).toBe('valid');
    expect((await db.doc(`tenants/demo/tickets/${other}`).get()).get('status')).toBe('valid');
  });

  it('two scans of the same ticket at once: exactly one is valid', async () => {
    const [a, b] = await Promise.all([as('scanner@demo.test'), as('organizer@demo.test')]);
    const id = await ticket();
    const before = await stats();
    const results = await Promise.all([
      a.checkIn({ eventId: EVENT, payload: qr(id) }),
      b.checkIn({ eventId: EVENT, payload: qr(id) }),
      a.checkIn({ eventId: EVENT, ticketId: id }),
    ]);
    expect(results.filter((r) => r.result === 'valid')).toHaveLength(1);
    expect(results.filter((r) => r.result === 'already_used')).toHaveLength(2);
    expect(await stats()).toBe(before + 1);
  });

  it('only assigned scanners and the owning organizer may scan', async () => {
    const scanner = await as('scanner@demo.test');
    const id = await ticket(UNASSIGNED);
    await expect(scanner.checkIn({ eventId: UNASSIGNED, payload: qr(id) })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
    const organizer = await as('organizer@demo.test');
    expect(await organizer.checkIn({ eventId: UNASSIGNED, payload: qr(id) })).toMatchObject({
      result: 'valid',
    });
    const attendee = await as('attendee@demo.test');
    await expect(attendee.checkIn({ eventId: EVENT, payload: qr(await ticket()) })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });
  });

  it('rejects unknown fields and malformed input', async () => {
    const scanner = await as('scanner@demo.test');
    await expect(scanner.checkIn({ eventId: EVENT, ticketId: 'abc', status: 'used' })).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    });
    await expect(scanner.checkIn({ eventId: '../x', ticketId: 'abc' })).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    });
  });
});

describe('createScanner / updateScanner', () => {
  it('organizer adds staff: claims, assignment, users doc, invitation email, audit log', async () => {
    const organizer = await as('organizer@demo.test');
    const email = uniqueEmail('staff');
    const { data } = await organizer.createScanner({ name: 'Gate Person', email, eventIds: [EVENT] });
    const tenantAuth = adminAuth.tenantManager().authForTenant(pool);
    const user = await tenantAuth.getUser(data.uid);
    const organizerClaims = (await tenantAuth.getUserByEmail('organizer@demo.test')).customClaims!;
    expect(user.customClaims).toEqual({
      role: 'scanner',
      tenantId: 'demo',
      organizerId: organizerClaims.organizerId,
    });

    const a = await db.doc(`tenants/demo/scannerAssignments/${data.uid}`).get();
    expect(a.data()).toMatchObject({
      eventIds: [EVENT],
      name: 'Gate Person',
      email,
      active: true,
      scanCount: 0,
    });
    expect((await db.doc(`users/${data.uid}`).get()).get('tenantId')).toBe('demo');
    const mail = await db.collection('devEmails').where('to', '==', email).get();
    expect(mail.size).toBe(1);
    expect(mail.docs[0]!.get('subject')).toContain('invited to scan');
    const logs = await db.collection('tenants/demo/auditLogs').where('target.uid', '==', data.uid).get();
    expect(logs.docs.map((d) => d.get('action'))).toContain('scanner.create');

    await expect(organizer.createScanner({ name: 'Again', email, eventIds: [EVENT] })).rejects.toMatchObject({
      code: 'functions/already-exists',
    });
  });

  it('turning staff off blocks scanning even with a live token', async () => {
    const organizer = await as('organizer@demo.test');
    const email = uniqueEmail('staff');
    const { data } = await organizer.createScanner({ name: 'Temp Staff', email, eventIds: [EVENT] });
    await adminAuth
      .tenantManager()
      .authForTenant(pool)
      .updateUser(data.uid, { password: 'temp-Password-123' });
    const staff = await as(email, 'temp-Password-123');
    expect(await staff.checkIn({ eventId: EVENT, payload: qr(await ticket()) })).toMatchObject({
      result: 'valid',
    });

    await organizer.updateScanner({ uid: data.uid, active: false });
    expect((await adminAuth.tenantManager().authForTenant(pool).getUser(data.uid)).disabled).toBe(true);
    await expect(staff.checkIn({ eventId: EVENT, payload: qr(await ticket()) })).rejects.toMatchObject({
      code: 'functions/permission-denied',
    });

    await organizer.updateScanner({ uid: data.uid, active: true, eventIds: [EVENT_2] });
    const a = await db.doc(`tenants/demo/scannerAssignments/${data.uid}`).get();
    expect(a.get('active')).toBe(true);
    expect(a.get('eventIds')).toEqual([EVENT_2]);
  });

  it('refuses other organizers’ events and staff, and non-organizers', async () => {
    const organizer = await as('organizer@demo.test');
    const foreign = db.collection('tenants/demo/events').doc();
    await foreign.set({ organizerId: 'someone-else', title: 'Not yours', status: 'published' });
    await expect(
      organizer.createScanner({ name: 'Sneaky', email: uniqueEmail('staff'), eventIds: [foreign.id] }),
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });

    const theirs = db.collection('tenants/demo/scannerAssignments').doc();
    await theirs.set({ organizerId: 'someone-else', eventIds: [foreign.id], active: true });
    await expect(organizer.updateScanner({ uid: theirs.id, active: false })).rejects.toMatchObject({
      code: 'functions/not-found',
    });
    await expect(
      organizer.updateScanner({ uid: theirs.id, eventIds: [EVENT], extra: 1 }),
    ).rejects.toMatchObject({
      code: 'functions/invalid-argument',
    });

    const scanner = await as('scanner@demo.test');
    await expect(
      scanner.createScanner({ name: 'Self Made', email: uniqueEmail('staff'), eventIds: [EVENT] }),
    ).rejects.toMatchObject({ code: 'functions/permission-denied' });
    await foreign.delete();
    await theirs.delete();
  });
});
