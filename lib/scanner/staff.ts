import 'server-only';

import type { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

export type StaffMember = {
  uid: string;
  name: string;
  email: string;
  eventIds: string[];
  active: boolean;
  scanCount: number;
  lastScanAt: Date | null;
};

/** The organizer's check-in staff (scannerAssignments written by the createScanner function). */
export async function listStaff(tenantId: string, organizerId: string): Promise<StaffMember[]> {
  const snap = await adminDb()
    .collection(`tenants/${tenantId}/scannerAssignments`)
    .where('organizerId', '==', organizerId)
    .limit(200)
    .get();
  return snap.docs
    .map((d) => ({
      uid: d.id,
      name: (d.get('name') as string | undefined) ?? '',
      email: (d.get('email') as string | undefined) ?? '',
      eventIds: (d.get('eventIds') as string[] | undefined) ?? [],
      active: d.get('active') !== false,
      scanCount: (d.get('scanCount') as number | undefined) ?? 0,
      lastScanAt: (d.get('lastScanAt') as Timestamp | null | undefined)?.toDate() ?? null,
    }))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
}
