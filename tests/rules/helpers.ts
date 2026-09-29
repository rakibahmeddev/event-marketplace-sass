import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';

export const ROLES = ['platform_admin', 'tenant_admin', 'organizer', 'scanner', 'attendee'] as const;
export type Role = (typeof ROLES)[number];

export async function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: 'demo-ticketing',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
}

/** A signed-in user of `tenantId` with `role` (claims shaped like the ones Cloud Functions set). */
export function as(env: RulesTestEnvironment, uid: string, role: Role, tenantId = 'tA') {
  const claims: Record<string, string> = { role, tenantId };
  if (role === 'organizer') claims.organizerId = `org-${uid}`;
  return env.authenticatedContext(uid, claims);
}

/** Seeds docs bypassing rules. */
export async function seed(env: RulesTestEnvironment, docs: Record<string, Record<string, unknown>>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await Promise.all(Object.entries(docs).map(([path, data]) => db.doc(path).set(data)));
  });
}

export const tenantDoc = (name: string) => ({
  name,
  status: 'active',
  authTenantId: `auth-${name}`,
  commissionRate: 0.035,
  branding: { name, primaryColor: '#5B2EE0', accentColor: '#FF6B4A' },
});
