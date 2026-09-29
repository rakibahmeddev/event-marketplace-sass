import 'server-only';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { PATHNAME_HEADER } from '@/lib/tenant/headers';
import { safeNextPath } from './next-path';
import type { Role } from './roles';
import { getSessionUser, type SessionUser } from './session';

/** Redirects to /login (with ?next=) when nobody is signed in. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const path = safeNextPath((await headers()).get(PATHNAME_HEADER));
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return user;
}

/** Signed in + one of the given roles, otherwise the /forbidden page. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/forbidden');
  return user;
}
