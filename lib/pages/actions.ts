'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { rateLimit } from '@/lib/security/rateLimit';
import { resolveImage, storagePaths } from '@/lib/storage/server';
import { getCurrentTenant } from '@/lib/tenant/current';
import { defaultPage } from './defaults';
import { pageRef } from './repository';
import { imageEditSchema, pageEditInput, pageSectionsSchema, type PageId, type Section } from './schema';

const PUBLIC_PATH: Record<PageId, string> = {
  home: '/',
  about: '/about',
  'become-organizer': '/become-an-organizer',
};

async function admin() {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'tenant_admin' || user.tenantId !== tenant.id) return null;
  if (!(await rateLimit(`pages:${user.uid}`, { limit: 30, windowSeconds: 60 }))) return 'rate' as const;
  return { user, tenant };
}

/**
 * Editor payload → validated sections. Image fields arrive as { path } | null; each path must be an
 * existing image in the marketplace's branding folder, and the URL is generated here.
 */
async function toSections(tenantId: string, input: unknown) {
  const parsed = pageEditInput.safeParse(input);
  if (!parsed.success) return { error: fail('Invalid request.') };
  const { page } = parsed.data;
  const sections: unknown[] = [];
  const imageErrors: Record<string, string> = {};
  for (const [i, raw] of parsed.data.sections.entries()) {
    if (!('image' in raw)) {
      sections.push(raw);
      continue;
    }
    const edit = imageEditSchema.safeParse(raw.image);
    if (!edit.success) {
      imageErrors[`${i}.image`] = 'Upload the image again';
      continue;
    }
    const image = edit.data
      ? await resolveImage(edit.data.path, [storagePaths.brandingLogo(tenantId)])
      : null;
    if (edit.data && !image) imageErrors[`${i}.image`] = 'Upload the image again';
    sections.push({ ...raw, image });
  }
  if (Object.keys(imageErrors).length) return { error: fail('Check the highlighted fields.', imageErrors) };
  const valid = pageSectionsSchema(page).safeParse(sections);
  if (!valid.success) return { error: fail('Check the highlighted fields.', zodFieldErrors(valid.error)) };
  return { page, sections: valid.data };
}

async function write(tenantId: string, uid: string, page: PageId, sections: Section[], publish: boolean) {
  const ref = pageRef(tenantId, page);
  const batch = adminDb().batch();
  batch.set(
    ref,
    {
      draft: sections,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
      ...(publish ? { published: sections, publishedAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true },
  );
  if (publish) {
    batch.set(adminDb().collection(`tenants/${tenantId}/auditLogs`).doc(), {
      actorUid: uid,
      action: 'settings.change',
      target: { page, change: 'publish', fields: 'pages' },
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  if (publish) revalidatePath(PUBLIC_PATH[page]);
}

/** Admin → Pages → Save draft. Visitors don't see it until Publish. */
export async function savePageDraft(input: unknown): Promise<ActionResult> {
  const a = await admin();
  if (!a) return fail('Only marketplace admins can edit pages.');
  if (a === 'rate') return fail('Too many saves. Wait a moment.');
  const r = await toSections(a.tenant.id, input);
  if ('error' in r) return r.error!;
  await write(a.tenant.id, a.user.uid, r.page, r.sections, false);
  return { ok: true };
}

/** Admin → Pages → Publish: saves and makes the draft live (audit-logged). */
export async function publishPage(input: unknown): Promise<ActionResult> {
  const a = await admin();
  if (!a) return fail('Only marketplace admins can edit pages.');
  if (a === 'rate') return fail('Too many saves. Wait a moment.');
  const r = await toSections(a.tenant.id, input);
  if ('error' in r) return r.error!;
  await write(a.tenant.id, a.user.uid, r.page, r.sections, true);
  return { ok: true };
}

/** Admin → Pages → Reset: the draft goes back to the built-in content (publish to make it live). */
export async function resetPageDraft(input: unknown): Promise<ActionResult<{ sections: Section[] }>> {
  const a = await admin();
  if (!a) return fail('Only marketplace admins can edit pages.');
  if (a === 'rate') return fail('Too many saves. Wait a moment.');
  const parsed = pageEditInput.pick({ page: true }).strict().safeParse(input);
  if (!parsed.success) return fail('Invalid request.');
  const sections = defaultPage(parsed.data.page);
  await write(a.tenant.id, a.user.uid, parsed.data.page, sections, false);
  return { ok: true, data: { sections } };
}
