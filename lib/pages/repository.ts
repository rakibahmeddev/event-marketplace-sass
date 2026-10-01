import 'server-only';

import { cache } from 'react';
import type { Timestamp } from 'firebase-admin/firestore';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { normalizePage } from './defaults';
import { isValidSection, type PageId, type Section } from './schema';

/** tenants/{t}/pages/{page} → { draft, published, updatedAt, updatedBy, publishedAt } (server only). */
export const pageRef = (tenantId: string, page: PageId) => adminDb().doc(`tenants/${tenantId}/pages/${page}`);

export type PageState = {
  draft: Section[];
  published: Section[];
  publishedAt: Date | null;
  updatedAt: Date | null;
  /** Draft differs from what visitors see. */
  unpublished: boolean;
};

export const getPageState = cache(async (tenantId: string, page: PageId): Promise<PageState> => {
  const snap = await pageRef(tenantId, page).get();
  const published = normalizePage(page, snap.get('published') as unknown[] | undefined, isValidSection);
  const draft = normalizePage(
    page,
    (snap.get('draft') as unknown[] | undefined) ?? (snap.get('published') as unknown[] | undefined),
    isValidSection,
  );
  return {
    draft,
    published,
    publishedAt: (snap.get('publishedAt') as Timestamp | undefined)?.toDate() ?? null,
    updatedAt: (snap.get('updatedAt') as Timestamp | undefined)?.toDate() ?? null,
    unpublished: JSON.stringify(draft) !== JSON.stringify(published),
  };
});

/**
 * Sections for a public page. `?preview=1` shows the draft, but only to this marketplace's admins;
 * everyone else always gets the published version.
 */
export async function getPublicSections(
  tenantId: string,
  page: PageId,
  previewParam: string | undefined,
): Promise<{ sections: Section[]; preview: boolean }> {
  const state = await getPageState(tenantId, page);
  if (previewParam === '1') {
    const user = await getSessionUser();
    if (user?.role === 'tenant_admin' && user.tenantId === tenantId)
      return { sections: state.draft, preview: true };
  }
  return { sections: state.published, preview: false };
}

/** Typed lookup for a page component: the section of that type if it's enabled. */
export function sectionOf<T extends Section['type']>(sections: Section[], type: T) {
  const s = sections.find((x) => x.type === type);
  return s && s.enabled ? (s as Extract<Section, { type: T }>) : null;
}
