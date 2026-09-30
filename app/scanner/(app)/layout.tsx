import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeNextPath } from '@/lib/auth/next-path';
import { getSessionUser } from '@/lib/auth/session';
import { PATHNAME_HEADER } from '@/lib/tenant/headers';

/** Scanner screens: staff (scanner role) and organizers only; everyone else signs in on the staff login. */
export default async function ScannerAppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    const path = safeNextPath((await headers()).get(PATHNAME_HEADER));
    redirect(`/scanner/login?next=${encodeURIComponent(path)}`);
  }
  if (user.role !== 'scanner' && user.role !== 'organizer') redirect('/forbidden');
  return children;
}
