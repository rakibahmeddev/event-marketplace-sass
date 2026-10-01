import 'server-only';

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { categoryDocSchema, type Category } from './schema';

/** One read per tenant per request (React cache keys on arguments, so the options object stays outside). */
const readCategories = cache(async (tenantId: string): Promise<Category[]> => {
  const snap = await adminDb().collection(`tenants/${tenantId}/categories`).orderBy('order').get();
  return snap.docs
    .map((d) => {
      const parsed = categoryDocSchema.safeParse(d.data());
      return parsed.success ? { id: d.id, ...parsed.data } : null;
    })
    .filter((c): c is Category => !!c);
});

export async function listCategories(
  tenantId: string,
  opts: { includeHidden?: boolean } = {},
): Promise<Category[]> {
  const all = await readCategories(tenantId);
  return opts.includeHidden ? all : all.filter((c) => c.active);
}

export async function categoryMap(tenantId: string): Promise<Map<string, Category>> {
  return new Map((await listCategories(tenantId, { includeHidden: true })).map((c) => [c.id, c]));
}
