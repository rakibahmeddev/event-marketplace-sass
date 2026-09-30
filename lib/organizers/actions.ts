'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { listCategories } from '@/lib/categories/repository';
import { adminDb } from '@/lib/firebase/admin';
import { searchWords } from '@/lib/format/text';
import { rateLimit } from '@/lib/security/rateLimit';
import { resolveImage, storagePaths } from '@/lib/storage/server';
import { getCurrentTenant } from '@/lib/tenant/current';
import { isOrganizerSlugTaken } from './repository';
import { organizerApplicationSchema, organizerProfileSchema, organizerSlugSchema } from './schema';

/** Live "Available" check for the profile URL field. */
export async function checkOrganizerSlug(raw: string): Promise<{ available: boolean; message?: string }> {
  const tenant = await getCurrentTenant();
  const parsed = organizerSlugSchema.safeParse(raw);
  if (!tenant) return { available: false };
  if (!parsed.success) return { available: false, message: parsed.error.issues[0]?.message };
  const taken = await isOrganizerSlugTaken(tenant.id, parsed.data);
  return taken ? { available: false, message: 'Already taken' } : { available: true };
}

/** "Become an organizer" step 2: creates a pending organizer profile for the signed-in attendee. */
export async function applyAsOrganizer(input: unknown): Promise<ActionResult<{ organizerId: string }>> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return fail('Please log in to continue.');
  if (user.role !== 'attendee') return fail('This account already has a role on this marketplace.');
  if (!(await rateLimit(`apply:${user.uid}`, { limit: 10, windowSeconds: 3600 })))
    return fail('Too many attempts. Try later.');

  const parsed = organizerApplicationSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const data = parsed.data;

  const categories = await listCategories(tenant.id);
  if (!categories.some((c) => c.id === data.category))
    return fail('Check the highlighted fields.', { category: 'Choose a category' });

  let logo = null;
  if (data.logoPath) {
    logo = await resolveImage(data.logoPath, [storagePaths.applicationLogo(tenant.id, user.uid)]);
    if (!logo) return fail('Check the highlighted fields.', { logoPath: 'Upload the logo again' });
  }

  const col = adminDb().collection(`tenants/${tenant.id}/organizers`);
  const ref = col.doc();
  try {
    await adminDb().runTransaction(async (tx) => {
      const [bySlug, byOwner] = await Promise.all([
        tx.get(col.where('slug', '==', data.slug).limit(1)),
        tx.get(col.where('ownerUid', '==', user.uid).limit(1)),
      ]);
      if (!byOwner.empty) throw new Error('already_applied');
      if (!bySlug.empty) throw new Error('slug_taken');
      tx.create(ref, {
        name: data.name,
        slug: data.slug,
        logo,
        bio: data.bio,
        status: 'pending',
        ownerUid: user.uid,
        category: data.category,
        city: data.city,
        createdAt: FieldValue.serverTimestamp(),
        approvedAt: null,
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'slug_taken') return fail('Check the highlighted fields.', { slug: 'Already taken' });
    if (code === 'already_applied')
      return fail('You have already applied. We’ll email you once you’re approved.');
    throw err;
  }
  revalidatePath('/admin/organizers');
  return { ok: true, data: { organizerId: ref.id } };
}

/** Dashboard → Settings. Keeps the denormalised organizer name on events in sync. */
export async function updateOrganizerProfile(input: unknown): Promise<ActionResult> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'organizer' || !user.organizerId)
    return fail('Only organizers can do this.');

  const parsed = organizerProfileSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const data = parsed.data;

  const orgRef = adminDb().doc(`tenants/${tenant.id}/organizers/${user.organizerId}`);
  const org = await orgRef.get();
  if (!org.exists || org.get('ownerUid') !== user.uid) return fail('Organizer not found.');

  let logo = org.get('logo') ?? null;
  if (data.logoPath === null) logo = null;
  else if (data.logoPath !== logo?.path) {
    logo = await resolveImage(data.logoPath, [
      storagePaths.organizerLogo(tenant.id, user.organizerId),
      storagePaths.applicationLogo(tenant.id, user.uid),
    ]);
    if (!logo) return fail('Check the highlighted fields.', { logoPath: 'Upload the logo again' });
  }

  const batch = adminDb().batch();
  batch.update(orgRef, { name: data.name, city: data.city, bio: data.bio, logo });
  if (data.name !== org.get('name')) {
    const events = await adminDb()
      .collection(`tenants/${tenant.id}/events`)
      .where('organizerId', '==', user.organizerId)
      .get();
    for (const e of events.docs) {
      batch.update(e.ref, {
        organizerName: data.name,
        searchWords: searchWords(e.get('title'), data.name, e.get('city')),
      });
    }
  }
  await batch.commit();
  revalidatePath('/', 'layout');
  return { ok: true };
}
