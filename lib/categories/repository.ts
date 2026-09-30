import 'server-only';

import { cache } from 'react';
import { adminDb } from '@/lib/firebase/admin';
import { categoryDocSchema, type Category } from './schema';

export const listCategories = cache(
  async (tenantId: string, opts: { includeHidden?: boolean } = {}): Promise<Category[]> => {
    const snap = await adminDb().collection(`tenants/${tenantId}/categories`).orderBy('order').get();
    return snap.docs
      .map((d) => {
        const parsed = categoryDocSchema.safeParse(d.data());
        return parsed.success ? { id: d.id, ...parsed.data } : null;
      })
      .filter((c): c is Category => !!c && (opts.includeHidden || c.active));
  },
);

export async function categoryMap(tenantId: string): Promise<Map<string, Category>> {
  return new Map((await listCategories(tenantId, { includeHidden: true })).map((c) => [c.id, c]));
}
