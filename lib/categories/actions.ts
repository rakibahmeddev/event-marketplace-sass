'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { slugify } from '@/lib/format/text';
import { rateLimit } from '@/lib/security/rateLimit';
import { getCurrentTenant } from '@/lib/tenant/current';
import { categoryInputSchema } from './schema';

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

async function adminContext() {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'tenant_admin') return null;
  // Over the limit reads as "not allowed" — admins never get near 60 category edits a minute.
  if (!(await rateLimit(`categories:${user.uid}`, { limit: 60, windowSeconds: 60 }))) return null;
  return { user, tenant };
}

function done(): ActionResult {
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function createCategory(input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return fail('Only marketplace admins can manage categories.');
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const col = adminDb().collection(`tenants/${ctx.tenant.id}/categories`);
  const slug = slugify(parsed.data.name);
  if (!slug) return fail('Check the highlighted fields.', { name: 'Use letters or numbers' });
  // The slug is the document id, so browse URLs read /events?category=food-and-drink.
  const last = await col.orderBy('order', 'desc').limit(1).get();
  try {
    await col.doc(slug).create({
      ...parsed.data,
      slug,
      order: ((last.docs[0]?.get('order') as number | undefined) ?? 0) + 1,
      active: true,
    });
  } catch {
    return fail('Check the highlighted fields.', { name: 'A category with this name exists' });
  }
  return done();
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return fail('Only marketplace admins can manage categories.');
  if (!idSchema.safeParse(id).success) return fail('Invalid category.');
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const ref = adminDb().doc(`tenants/${ctx.tenant.id}/categories/${id}`);
  if (!(await ref.get()).exists) return fail('Category not found.');
  // The slug stays stable so existing links and filters keep working.
  await ref.update({ name: parsed.data.name, icon: parsed.data.icon });
  return done();
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return fail('Only marketplace admins can manage categories.');
  if (!idSchema.safeParse(id).success || typeof active !== 'boolean') return fail('Invalid request.');
  const ref = adminDb().doc(`tenants/${ctx.tenant.id}/categories/${id}`);
  if (!(await ref.get()).exists) return fail('Category not found.');
  await ref.update({ active });
  return done();
}

/** Swap with the neighbour above/below. */
export async function moveCategory(id: string, direction: 'up' | 'down'): Promise<ActionResult> {
  const ctx = await adminContext();
  if (!ctx) return fail('Only marketplace admins can manage categories.');
  if (!idSchema.safeParse(id).success || (direction !== 'up' && direction !== 'down'))
    return fail('Invalid request.');
  const snap = await adminDb().collection(`tenants/${ctx.tenant.id}/categories`).orderBy('order').get();
  const i = snap.docs.findIndex((d) => d.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  const a = snap.docs[i];
  const b = snap.docs[j];
  if (!a || !b) return { ok: true };
  const batch = adminDb().batch();
  batch.update(a.ref, { order: b.get('order') });
  batch.update(b.ref, { order: a.get('order') });
  await batch.commit();
  return done();
}
