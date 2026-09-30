'use server';

import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { categoryMap } from '@/lib/categories/repository';
import { adminDb } from '@/lib/firebase/admin';
import { searchWords, slugify } from '@/lib/format/text';
import { zonedToUtc } from '@/lib/format/time';
import { getOrganizer } from '@/lib/organizers/repository';
import type { ImageRef } from '@/lib/organizers/schema';
import { rateLimit } from '@/lib/security/rateLimit';
import { resolveImage, storagePaths } from '@/lib/storage/server';
import { getCurrentTenant } from '@/lib/tenant/current';
import { eventInputSchema, publishRequirements, type TicketTypeInput } from './schema';

const EVENT_ID = /^[A-Za-z0-9]{12,40}$/;

async function organizerContext() {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'organizer' || !user.organizerId) return null;
  const organizer = await getOrganizer(tenant.id, user.organizerId);
  if (!organizer || organizer.status !== 'approved' || organizer.ownerUid !== user.uid) return null;
  return { user, tenant, organizer };
}

function when(date: string, time: string, tz: string): Date | null | 'invalid' {
  if (!date && !time) return null;
  if (!date || !time) return 'invalid';
  return zonedToUtc(date, time, tz) ?? 'invalid';
}

type TicketPlan = { ref: DocumentReference; data: Record<string, unknown>; isNew: boolean };

/**
 * Create or update an event (+ ticket types). `intent: 'publish'` also publishes.
 * All server-owned fields (status, sold, totals, organizer, slug) are computed here.
 */
export async function saveEvent(
  eventId: string,
  input: unknown,
  intent: 'save' | 'publish',
): Promise<ActionResult<{ eventId: string; slug: string; status: string }>> {
  const ctx = await organizerContext();
  if (!ctx) return fail('Only approved organizers can edit events.');
  const { user, tenant, organizer } = ctx;
  if (!EVENT_ID.test(eventId)) return fail('Invalid event.');
  if (!(await rateLimit(`saveEvent:${user.uid}`, { limit: 60, windowSeconds: 60 })))
    return fail('Too many saves. Wait a moment.');

  const parsed = eventInputSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const d = parsed.data;
  const errors: Record<string, string> = {};

  const startAt = when(d.startDate, d.startTime, d.timezone);
  const endAt = when(d.endDate, d.endTime, d.timezone);
  if (startAt === 'invalid') errors.startDate = 'Enter a valid start date and time';
  if (endAt === 'invalid') errors.endDate = 'Enter a valid end date and time';
  if (startAt instanceof Date && endAt instanceof Date && endAt <= startAt)
    errors.endDate = 'End must be after the start';

  const categories = await categoryMap(tenant.id);
  if (d.category && !categories.get(d.category)?.active) errors.category = 'Choose a category';

  const ticketTimes = d.ticketTypes.map((t, i) => {
    const s = when(t.salesStartDate, t.salesStartTime, d.timezone);
    const e = when(t.salesEndDate, t.salesEndTime, d.timezone);
    if (s === 'invalid') errors[`ticketTypes.${i}.salesStartDate`] = 'Invalid date';
    if (e === 'invalid') errors[`ticketTypes.${i}.salesEndDate`] = 'Invalid date';
    if (s instanceof Date && e instanceof Date && e <= s)
      errors[`ticketTypes.${i}.salesEndDate`] = 'Must end after sales start';
    return { salesStartAt: s instanceof Date ? s : null, salesEndAt: e instanceof Date ? e : null };
  });
  if (Object.keys(errors).length) return fail('Check the highlighted fields.', errors);

  const eventRef = adminDb().doc(`tenants/${tenant.id}/events/${eventId}`);
  const existing = await eventRef.get();
  if (existing.exists && existing.get('organizerId') !== organizer.id) return fail('Event not found.');
  if (existing.get('status') === 'cancelled') return fail('Cancelled events can’t be edited.');

  // Images: keep ones already on the event, resolve new uploads from this event's folder only.
  const current = new Map<string, ImageRef>(
    ((existing.get('images') as ImageRef[] | undefined) ?? []).map((i) => [i.path, i]),
  );
  const images: ImageRef[] = [];
  for (const path of d.imagePaths) {
    const img =
      current.get(path) ??
      (await resolveImage(path, [storagePaths.eventImages(tenant.id, organizer.id, eventId)]));
    if (!img)
      return fail('An image could not be verified. Upload it again.', {
        imagePaths: 'Upload the image again',
      });
    images.push(img);
  }

  const status = (existing.get('status') as string | undefined) ?? 'draft';
  const nextStatus = intent === 'publish' ? 'published' : status;
  const checks = publishRequirements({
    title: d.title,
    category: d.category,
    imagesCount: images.length,
    startAt: startAt instanceof Date ? startAt : null,
    endAt: endAt instanceof Date ? endAt : null,
    isOnline: d.isOnline,
    venueName: d.venueName,
    venueCity: d.venueCity,
    ticketTypesCount: d.ticketTypes.length,
    now: new Date(),
  });
  if (nextStatus === 'published' && checks.some((c) => !c.ok)) {
    const missing = checks.filter((c) => !c.ok).map((c) => c.label.toLowerCase());
    return fail(`To publish, complete: ${missing.join(', ')}.`);
  }

  const city = d.isOnline ? '' : d.venueCity;
  const categoryName = d.category ? (categories.get(d.category)?.name ?? '') : '';

  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const ttCol = eventRef.collection('ticketTypes');
      const existingTts = await tx.get(ttCol);
      const byId = new Map(existingTts.docs.map((doc) => [doc.id, doc]));
      const plans: TicketPlan[] = [];
      const keep = new Set<string>();

      d.ticketTypes.forEach((t: TicketTypeInput, i) => {
        const times = ticketTimes[i]!;
        if (t.id) {
          const doc = byId.get(t.id);
          if (!doc)
            throw new FieldError(
              `ticketTypes.${i}.name`,
              'This ticket type no longer exists. Reload the page.',
            );
          keep.add(t.id);
          const committed = (doc.get('sold') as number) + (doc.get('reserved') as number);
          if (committed > 0 && t.price !== doc.get('price')) {
            throw new FieldError(`ticketTypes.${i}.price`, 'Price can’t change after tickets are sold');
          }
          if (t.quantity < committed)
            throw new FieldError(`ticketTypes.${i}.quantity`, `At least ${committed} (already sold or held)`);
          plans.push({
            ref: doc.ref,
            isNew: false,
            data: {
              name: t.name,
              description: t.description,
              price: t.price,
              quantity: t.quantity,
              order: i,
              ...times,
            },
          });
        } else {
          plans.push({
            ref: ttCol.doc(),
            isNew: true,
            data: {
              name: t.name,
              description: t.description,
              price: t.price,
              currency: tenant.currency,
              quantity: t.quantity,
              sold: 0,
              reserved: 0,
              order: i,
              ...times,
            },
          });
        }
      });

      const removed = existingTts.docs.filter((doc) => !keep.has(doc.id));
      for (const doc of removed) {
        if ((doc.get('sold') as number) + (doc.get('reserved') as number) > 0) {
          throw new FieldError(
            'ticketTypes',
            `“${doc.get('name')}” has sales and can’t be removed. Set its quantity instead.`,
          );
        }
      }

      const prices = d.ticketTypes.map((t) => t.price);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const totalSold = existingTts.docs
        .filter((doc) => keep.has(doc.id))
        .reduce((n, doc) => n + (doc.get('sold') as number), 0);
      const slug =
        existing.exists && (status !== 'draft' || existing.get('slug'))
          ? (existing.get('slug') as string)
          : `${slugify(d.title) || 'event'}-${eventId.slice(0, 6).toLowerCase()}`;

      const eventData = {
        organizerId: organizer.id,
        title: d.title,
        slug,
        category: d.category,
        description: d.description,
        images,
        venue: d.isOnline
          ? { name: '', address: '', city: '', country: '' }
          : { name: d.venueName, address: d.venueAddress, city: d.venueCity, country: d.venueCountry },
        isOnline: d.isOnline,
        timezone: d.timezone,
        refundPolicy: d.refundPolicy,
        startAt: startAt instanceof Date ? startAt : null,
        endAt: endAt instanceof Date ? endAt : null,
        status: nextStatus,
        publishedAt:
          nextStatus === 'published' && !existing.get('publishedAt')
            ? FieldValue.serverTimestamp()
            : (existing.get('publishedAt') ?? null),
        organizerName: organizer.name,
        organizerSlug: organizer.slug,
        city,
        currency: tenant.currency,
        minPrice,
        isFree: minPrice === 0,
        totalQuantity: d.ticketTypes.reduce((n, t) => n + t.quantity, 0),
        totalSold,
        searchWords: searchWords(d.title, organizer.name, city, categoryName),
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      };

      tx.set(eventRef, eventData, { merge: true });
      for (const p of plans) {
        if (p.isNew) tx.create(p.ref, p.data);
        else tx.update(p.ref, p.data);
      }
      for (const doc of removed) tx.delete(doc.ref);
      return { slug, status: nextStatus };
    });

    revalidatePath('/dashboard/events');
    revalidatePath(`/events/${result.slug}`);
    return { ok: true, data: { eventId, ...result } };
  } catch (err) {
    if (err instanceof FieldError) return fail('Check the highlighted fields.', { [err.field]: err.message });
    throw err;
  }
}

class FieldError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Unpublish (published → draft; only before any sale) or cancel (→ cancelled; refunds for
 * sold tickets are handled in Phase 4). Cancelled events stay visible with a notice.
 */
export async function changeEventStatus(
  eventId: string,
  action: 'unpublish' | 'cancel',
): Promise<ActionResult> {
  const ctx = await organizerContext();
  if (!ctx) return fail('Only approved organizers can do this.');
  if (!EVENT_ID.test(eventId)) return fail('Invalid event.');
  const ref = adminDb().doc(`tenants/${ctx.tenant.id}/events/${eventId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get('organizerId') !== ctx.organizer.id) return fail('Event not found.');
  const status = snap.get('status') as string;

  if (action === 'unpublish') {
    if (status !== 'published') return fail('Only published events can be unpublished.');
    if ((snap.get('totalSold') as number) > 0)
      return fail('Tickets have been sold — cancel the event instead.');
    await ref.update({ status: 'draft', updatedAt: FieldValue.serverTimestamp() });
  } else {
    if (status === 'cancelled') return fail('Already cancelled.');
    await ref.update({ status: 'cancelled', updatedAt: FieldValue.serverTimestamp() });
  }
  revalidatePath('/dashboard/events');
  revalidatePath(`/events/${snap.get('slug')}`);
  return { ok: true };
}
