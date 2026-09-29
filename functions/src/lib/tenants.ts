import { z } from 'zod';
import { db } from './admin.js';

const tenantSchema = z.object({
  status: z.enum(['active', 'suspended']),
  authTenantId: z.string().min(1),
});

export type TenantRef = z.infer<typeof tenantSchema> & { id: string };

/** Maps an Identity Platform tenant to our tenants/{tenantId} doc. */
export async function tenantForAuthTenant(authTenantId: string): Promise<TenantRef | null> {
  const snap = await db.collection('tenants').where('authTenantId', '==', authTenantId).limit(2).get();
  if (snap.size !== 1) return null; // none, or ambiguous — refuse rather than guess
  const doc = snap.docs[0]!;
  const parsed = tenantSchema.safeParse(doc.data());
  return parsed.success ? { id: doc.id, ...parsed.data } : null;
}

export async function tenantById(tenantId: string): Promise<TenantRef | null> {
  const doc = await db.collection('tenants').doc(tenantId).get();
  const parsed = tenantSchema.safeParse(doc.data());
  return doc.exists && parsed.success ? { id: doc.id, ...parsed.data } : null;
}
