import 'server-only';

import { adminDb } from '@/lib/firebase/admin';
import { tenantDocSchema, tenantDomainDocSchema, type Tenant } from './schema';

// Short in development so re-seeded emulators are picked up immediately.
const TTL_MS = process.env.NODE_ENV === 'production' ? 60_000 : 2_000;
type Entry<T> = { value: T; expires: number };
const domainCache = new Map<string, Entry<string | null>>();
const tenantCache = new Map<string, Entry<Tenant | null>>();

function cached<T>(cache: Map<string, Entry<T>>, key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  cache.delete(key);
  return undefined;
}

/** hostname → tenantId via tenantDomains/{hostname}. Cached (including misses). */
export async function tenantIdForHost(hostname: string): Promise<string | null> {
  const hit = cached(domainCache, hostname);
  if (hit !== undefined) return hit;
  const snap = await adminDb().collection('tenantDomains').doc(hostname).get();
  const parsed = snap.exists ? tenantDomainDocSchema.safeParse(snap.data()) : null;
  const tenantId = parsed?.success ? parsed.data.tenantId : null;
  domainCache.set(hostname, { value: tenantId, expires: Date.now() + TTL_MS });
  return tenantId;
}

/** Loads and validates tenants/{tenantId}. Cached. Invalid docs are treated as missing. */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const hit = cached(tenantCache, tenantId);
  if (hit !== undefined) return hit;
  const snap = await adminDb().collection('tenants').doc(tenantId).get();
  let tenant: Tenant | null = null;
  if (snap.exists) {
    const parsed = tenantDocSchema.safeParse(snap.data());
    if (parsed.success) tenant = { id: snap.id, ...parsed.data };
    else console.error(`tenants/${tenantId} failed validation`, parsed.error.issues);
  }
  tenantCache.set(tenantId, { value: tenant, expires: Date.now() + TTL_MS });
  return tenant;
}

/** Drop cached copies after a settings change (other server instances refresh within the TTL). */
export function invalidateTenantCache(tenantId: string): void {
  tenantCache.delete(tenantId);
}
