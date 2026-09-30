import 'server-only';

import { cache } from 'react';
import type { Query } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { fromFirestore } from '@/lib/firestore/convert';
import { eventDocSchema, ticketTypeDocSchema, type EventRecord, type TicketType } from './schema';

const events = (tenantId: string) => adminDb().collection(`tenants/${tenantId}/events`);

function parseEvent(id: string, data: unknown): EventRecord | null {
  const parsed = eventDocSchema.safeParse(fromFirestore(data));
  if (!parsed.success) {
    console.error(`event ${id} failed validation`, parsed.error.issues);
    return null;
  }
  return { id, ...parsed.data };
}

export const getEvent = cache(async (tenantId: string, eventId: string): Promise<EventRecord | null> => {
  const snap = await events(tenantId).doc(eventId).get();
  return snap.exists ? parseEvent(snap.id, snap.data()) : null;
});

/** Public lookup: only published or cancelled events are visible by URL. */
export const getPublicEventBySlug = cache(
  async (tenantId: string, slug: string): Promise<EventRecord | null> => {
    const snap = await events(tenantId).where('slug', '==', slug).limit(1).get();
    const doc = snap.docs[0];
    const event = doc ? parseEvent(doc.id, doc.data()) : null;
    return event && (event.status === 'published' || event.status === 'cancelled') ? event : null;
  },
);

export const listTicketTypes = cache(async (tenantId: string, eventId: string): Promise<TicketType[]> => {
  const snap = await events(tenantId).doc(eventId).collection('ticketTypes').orderBy('order').get();
  return snap.docs
    .map((d) => {
      const parsed = ticketTypeDocSchema.safeParse(fromFirestore(d.data()));
      return parsed.success ? { id: d.id, ...parsed.data } : null;
    })
    .filter((t): t is TicketType => !!t);
});

export async function listOrganizerEvents(tenantId: string, organizerId: string): Promise<EventRecord[]> {
  const snap = await events(tenantId)
    .where('organizerId', '==', organizerId)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((d) => parseEvent(d.id, d.data())).filter((e): e is EventRecord => !!e);
}

export type EventFilters = {
  category?: string;
  city?: string;
  isOnline?: boolean;
  isFree?: boolean;
  from?: Date;
  to?: Date;
  word?: string;
  organizerId?: string;
};

export type EventPage = {
  events: EventRecord[];
  total: number;
  /** Opaque cursors for Prev / Next (eventId of the boundary doc). */
  next: string | null;
  prev: string | null;
};

/**
 * Upcoming published events, soonest first. Each optional equality filter has a
 * (status, field, startAt) composite index; Firestore merges them for combinations.
 */
export async function listPublishedEvents(
  tenantId: string,
  filters: EventFilters,
  page: { size: number; after?: string; before?: string },
): Promise<EventPage> {
  const now = new Date();
  let q: Query = events(tenantId).where('status', '==', 'published');
  if (filters.category) q = q.where('category', '==', filters.category);
  if (filters.city) q = q.where('city', '==', filters.city);
  if (filters.isOnline !== undefined) q = q.where('isOnline', '==', filters.isOnline);
  if (filters.isFree !== undefined) q = q.where('isFree', '==', filters.isFree);
  if (filters.word) q = q.where('searchWords', 'array-contains', filters.word);
  if (filters.organizerId) q = q.where('organizerId', '==', filters.organizerId);
  // Events that already ended drop out; ongoing ones stay listed.
  q = q.where('endAt', '>', filters.from && filters.from > now ? filters.from : now);
  if (filters.to) q = q.where('startAt', '<', filters.to);
  q = q.orderBy('endAt').orderBy('startAt').orderBy('__name__');

  const total = (await q.count().get()).data().count;

  let pageQuery = q.limit(page.size + 1);
  if (page.after) {
    const cursor = await events(tenantId).doc(page.after).get();
    if (cursor.exists) pageQuery = q.startAfter(cursor).limit(page.size + 1);
  } else if (page.before) {
    const cursor = await events(tenantId).doc(page.before).get();
    if (cursor.exists) pageQuery = q.endBefore(cursor).limitToLast(page.size + 1);
  }
  const snap = await pageQuery.get();
  let docs = snap.docs;
  let hasMoreBefore = !!page.after;
  let hasMoreAfter = false;
  if (page.before) {
    hasMoreBefore = docs.length > page.size;
    if (hasMoreBefore) docs = docs.slice(1);
    hasMoreAfter = true;
  } else {
    hasMoreAfter = docs.length > page.size;
    if (hasMoreAfter) docs = docs.slice(0, page.size);
  }
  const list = docs.map((d) => parseEvent(d.id, d.data())).filter((e): e is EventRecord => !!e);
  return {
    events: list,
    total,
    next: hasMoreAfter ? (docs.at(-1)?.id ?? null) : null,
    prev: hasMoreBefore ? (docs[0]?.id ?? null) : null,
  };
}

/** Past published events of an organizer, newest first (profile page). */
export async function listPastEvents(
  tenantId: string,
  organizerId: string,
  limit = 6,
): Promise<EventRecord[]> {
  const snap = await events(tenantId)
    .where('status', '==', 'published')
    .where('organizerId', '==', organizerId)
    .where('endAt', '<=', new Date())
    .orderBy('endAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => parseEvent(d.id, d.data())).filter((e): e is EventRecord => !!e);
}
