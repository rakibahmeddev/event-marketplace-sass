import 'server-only';

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { fromFirestore } from '@/lib/firestore/convert';
import { organizerDocSchema, type Organizer } from './schema';

const col = (tenantId: string) => adminDb().collection(`tenants/${tenantId}/organizers`);

function parse(id: string, data: unknown): Organizer | null {
  const parsed = organizerDocSchema.safeParse(fromFirestore(data));
  if (!parsed.success) {
    console.error(`organizer ${id} failed validation`, parsed.error.issues);
    return null;
  }
  return { id, ...parsed.data };
}

export const getOrganizer = cache(
  async (tenantId: string, organizerId: string): Promise<Organizer | null> => {
    const snap = await col(tenantId).doc(organizerId).get();
    return snap.exists ? parse(snap.id, snap.data()) : null;
  },
);

export const getOrganizerBySlug = cache(async (tenantId: string, slug: string): Promise<Organizer | null> => {
  const snap = await col(tenantId).where('slug', '==', slug).limit(1).get();
  const doc = snap.docs[0];
  return doc ? parse(doc.id, doc.data()) : null;
});

/** The organizer profile (any status) owned by this user, if they have applied. */
export const getOrganizerForOwner = cache(
  async (tenantId: string, uid: string): Promise<Organizer | null> => {
    const snap = await col(tenantId).where('ownerUid', '==', uid).limit(1).get();
    const doc = snap.docs[0];
    return doc ? parse(doc.id, doc.data()) : null;
  },
);

export async function listOrganizers(
  tenantId: string,
  status?: Organizer['status'],
  limit = 100,
): Promise<Organizer[]> {
  let q = col(tenantId).orderBy('createdAt', 'desc').limit(limit);
  if (status) q = col(tenantId).where('status', '==', status).orderBy('createdAt', 'desc').limit(limit);
  const snap = await q.get();
  return snap.docs.map((d) => parse(d.id, d.data())).filter((o): o is Organizer => !!o);
}

export async function isOrganizerSlugTaken(
  tenantId: string,
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const snap = await col(tenantId).where('slug', '==', slug).limit(2).get();
  return snap.docs.some((d) => d.id !== exceptId);
}
