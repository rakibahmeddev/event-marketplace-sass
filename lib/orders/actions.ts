'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fail, type ActionResult } from '@/lib/actions/result';
import { getSessionUser } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/rateLimit';
import { getCurrentTenant } from '@/lib/tenant/current';
import { refundOrder, RefundError } from './refund';

const orderId = z.string().regex(/^[A-Za-z0-9]{1,40}$/);

/** Full refund by the organizer who owns the event, or by the tenant admin. Audit-logged. */
export async function refundOrderAction(id: unknown): Promise<ActionResult> {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!user || !tenant) return fail('Please log in again.');
  if (user.role !== 'organizer' && user.role !== 'tenant_admin') return fail('You can’t refund orders.');
  const parsed = orderId.safeParse(id);
  if (!parsed.success) return fail('Invalid order.');
  if (!(await rateLimit(`refund:${user.uid}`, { limit: 20, windowSeconds: 60 })))
    return fail('Too many requests.');
  try {
    await refundOrder(
      tenant,
      parsed.data,
      user.uid,
      (organizerId) => user.role === 'tenant_admin' || organizerId === user.organizerId,
    );
  } catch (err) {
    if (err instanceof RefundError) return fail(err.message);
    console.error('refund failed', err instanceof Error ? err.message : err);
    return fail('The payment provider could not process the refund. Try again later.');
  }
  revalidatePath('/dashboard/orders');
  return { ok: true };
}
