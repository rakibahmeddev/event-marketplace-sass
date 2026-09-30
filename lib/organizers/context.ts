import 'server-only';

import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/guards';
import { requireTenant } from '@/lib/tenant/current';
import { getOrganizer } from './repository';

/** Signed-in approved organizer + their profile, for dashboard pages. */
export async function requireOrganizer() {
  const [user, tenant] = await Promise.all([requireRole('organizer'), requireTenant()]);
  const organizer = user.organizerId ? await getOrganizer(tenant.id, user.organizerId) : null;
  if (!organizer || organizer.ownerUid !== user.uid || organizer.status !== 'approved')
    redirect('/forbidden');
  return { user, tenant, organizer };
}
