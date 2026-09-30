'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { fail, zodFieldErrors, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { brandContrastProblems } from '@/lib/format/contrast';
import { rateLimit } from '@/lib/security/rateLimit';
import { resolveImage, storagePaths } from '@/lib/storage/server';
import { getCurrentTenant } from './current';
import { invalidateTenantCache } from './repository';
import { tenantSettingsInputSchema } from './settings';

/** Admin → Settings. Tenant admin only; every change is written to the audit log. */
export async function updateTenantSettings(input: unknown): Promise<ActionResult> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'tenant_admin')
    return fail('Only marketplace admins can change settings.');
  if (!(await rateLimit(`settings:${user.uid}`, { limit: 20, windowSeconds: 60 })))
    return fail('Too many saves. Wait a moment.');

  const parsed = tenantSettingsInputSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.', zodFieldErrors(parsed.error));
  const d = parsed.data;

  const contrast = brandContrastProblems(d.primaryColor, d.accentColor);
  if (Object.keys(contrast).length)
    return fail('Some colours are hard to read.', contrast as Record<string, string>);

  let logo = tenant.branding.logo ?? null;
  if (d.logoPath === null) logo = null;
  else if (d.logoPath !== logo?.path) {
    logo = await resolveImage(d.logoPath, [storagePaths.brandingLogo(tenant.id)]);
    if (!logo) return fail('Check the highlighted fields.', { logoPath: 'Upload the logo again' });
  }

  const socialLinks = Object.fromEntries(Object.entries(d.socialLinks).filter(([, v]) => v));
  const next = {
    name: d.name,
    'branding.name': d.name,
    'branding.primaryColor': d.primaryColor.toUpperCase(),
    'branding.accentColor': d.accentColor.toUpperCase(),
    'branding.logo': logo,
    supportEmail: d.supportEmail || FieldValue.delete(),
    footerTagline: d.footerTagline,
    socialLinks,
    commissionRate: Math.round(d.commissionPercent * 100) / 10_000,
  };

  // Record which fields changed (values of free-text fields are not copied into the log).
  const before: Record<string, unknown> = {
    name: tenant.name,
    'branding.primaryColor': tenant.branding.primaryColor.toUpperCase(),
    'branding.accentColor': tenant.branding.accentColor.toUpperCase(),
    'branding.logo': tenant.branding.logo?.path ?? null,
    supportEmail: tenant.supportEmail ?? '',
    footerTagline: tenant.footerTagline,
    socialLinks: JSON.stringify(tenant.socialLinks),
    commissionRate: tenant.commissionRate,
  };
  const after: Record<string, unknown> = {
    name: d.name,
    'branding.primaryColor': next['branding.primaryColor'],
    'branding.accentColor': next['branding.accentColor'],
    'branding.logo': logo?.path ?? null,
    supportEmail: d.supportEmail,
    footerTagline: d.footerTagline,
    socialLinks: JSON.stringify(socialLinks),
    commissionRate: next.commissionRate,
  };
  const changed = Object.keys(after).filter((k) => before[k] !== after[k]);
  if (changed.length === 0) return { ok: true };

  const tenantRef = adminDb().doc(`tenants/${tenant.id}`);
  const batch = adminDb().batch();
  batch.update(tenantRef, next);
  batch.set(tenantRef.collection('auditLogs').doc(), {
    actorUid: user.uid,
    action: 'settings.change',
    target: {
      fields: changed.join(', '),
      commissionRate: changed.includes('commissionRate') ? String(next.commissionRate) : null,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  invalidateTenantCache(tenant.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}
