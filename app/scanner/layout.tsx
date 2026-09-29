import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'Scan' };

/** Phase 5 adds the dedicated staff login screen from the design; until then /login is used. */
export default async function ScannerLayout({ children }: { children: ReactNode }) {
  await requireRole('scanner', 'organizer');
  return children;
}
