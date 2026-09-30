import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin.js';

export type AuditEntry = {
  actorUid: string;
  action:
    | 'role.change'
    | 'organizer.approve'
    | 'organizer.suspend'
    | 'refund'
    | 'checkin'
    | 'settings.change'
    | 'scanner.create'
    | 'scanner.update';
  target: Record<string, string | null>;
};

/** Appends to tenants/{tenantId}/auditLogs (server-only; rules deny client writes). */
export async function writeAudit(tenantId: string, entry: AuditEntry): Promise<void> {
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('auditLogs')
    .add({ ...entry, createdAt: FieldValue.serverTimestamp() });
}
