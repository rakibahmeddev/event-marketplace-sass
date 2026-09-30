import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import { stripeClient, stripeConfigured } from '@/lib/payments/stripe';
import { getCurrentTenant } from '@/lib/tenant/current';
import { invalidateTenantCache } from '@/lib/tenant/repository';

/** Back from Stripe onboarding: read the account's status and switch the marketplace to Stripe once charges are enabled. */
export async function GET(request: Request) {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  const back = new URL('/admin/settings', request.url);
  if (
    !user ||
    !tenant ||
    user.role !== 'tenant_admin' ||
    !stripeConfigured() ||
    !tenant.paymentConfig.stripeAccountId
  ) {
    return NextResponse.redirect(back);
  }
  const account = await stripeClient().accounts.retrieve(tenant.paymentConfig.stripeAccountId);
  const chargesEnabled = !!account.charges_enabled;
  const ref = adminDb().doc(`tenants/${tenant.id}`);
  await ref.update({
    'paymentConfig.chargesEnabled': chargesEnabled,
    ...(chargesEnabled ? { 'paymentConfig.provider': 'stripe' } : {}),
  });
  if (chargesEnabled && tenant.paymentConfig.provider !== 'stripe') {
    await ref.collection('auditLogs').add({
      actorUid: user.uid,
      action: 'settings.change',
      target: { fields: 'paymentConfig.provider=stripe', commissionRate: null },
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  invalidateTenantCache(tenant.id);
  back.searchParams.set('stripe', chargesEnabled ? 'connected' : 'incomplete');
  return NextResponse.redirect(back);
}
