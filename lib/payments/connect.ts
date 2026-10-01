'use server';

import { FieldValue } from 'firebase-admin/firestore';
import { headers } from 'next/headers';
import { fail, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { rateLimit } from '@/lib/security/rateLimit';
import { getCurrentTenant } from '@/lib/tenant/current';
import { invalidateTenantCache } from '@/lib/tenant/repository';
import { stripeClient, stripeConfigured } from './stripe';

/**
 * Admin → Settings → Payments → "Connect Stripe": creates (once) a Standard connected account for this
 * marketplace and returns Stripe's onboarding link. Card data never touches the platform.
 */
export async function startStripeOnboarding(): Promise<ActionResult<{ url: string }>> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant || user.role !== 'tenant_admin')
    return fail('Only marketplace admins can connect payments.');
  if (!(await rateLimit(`stripe-connect:${user.uid}`, { limit: 10, windowSeconds: 60 })))
    return fail('Too many attempts. Wait a moment.');
  if (!(await stripeConfigured())) return fail('Stripe keys are not configured on the server yet.');
  const stripe = await stripeClient();
  let accountId = tenant.paymentConfig.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create(
      { type: 'standard', metadata: { tenantId: tenant.id } },
      { idempotencyKey: `connect_${tenant.id}` },
    );
    accountId = account.id;
    const ref = adminDb().doc(`tenants/${tenant.id}`);
    await ref.update({ 'paymentConfig.stripeAccountId': accountId });
    await ref.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'settings.change',
      target: { fields: 'paymentConfig.stripeAccountId', commissionRate: null },
      createdAt: FieldValue.serverTimestamp(),
    });
    invalidateTenantCache(tenant.id);
  }
  const h = await headers();
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${proto}://${host}/admin/settings?stripe=refresh`,
    return_url: `${proto}://${host}/api/admin/stripe/return`,
  });
  return { ok: true, data: { url: link.url } };
}
