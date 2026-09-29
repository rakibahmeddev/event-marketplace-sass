/**
 * Seeds the local Firebase Emulator Suite. Refuses to run against anything but the emulators.
 *   npm run seed            (emulators must be running: npm run emulators)
 *
 * Creates two marketplaces with separate Identity Platform user pools:
 *   demo  → http://localhost:3000, http://demo.localhost:3000
 *   other → http://other.localhost:3000   (used to prove tenant isolation)
 * and one account per role. TEST CREDENTIALS ONLY — see scripts/seed-credentials.ts.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { SEED_PASSWORD } from './seed-credentials.ts';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-ticketing';
if (!projectId.startsWith('demo-')) {
  throw new Error(`Refusing to seed project "${projectId}": only demo-* (emulator) projects are allowed.`);
}

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();

type TenantSeed = {
  id: string;
  name: string;
  domains: string[];
  primaryColor: string;
  accentColor: string;
  users: { email: string; name: string; role: 'tenant_admin' | 'organizer' | 'scanner' | 'attendee' }[];
};

const tenants: TenantSeed[] = [
  {
    id: 'demo',
    name: 'brandname',
    domains: ['localhost', '127.0.0.1', 'demo.localhost'],
    primaryColor: '#5B2EE0',
    accentColor: '#FF6B4A',
    users: [
      { email: 'admin@demo.test', name: 'Dana Admin', role: 'tenant_admin' },
      { email: 'organizer@demo.test', name: 'Marcus Bell', role: 'organizer' },
      { email: 'scanner@demo.test', name: 'Tasha Green', role: 'scanner' },
      { email: 'attendee@demo.test', name: 'Jordan Lee', role: 'attendee' },
    ],
  },
  {
    id: 'other',
    name: 'Othertix',
    domains: ['other.localhost'],
    primaryColor: '#0F766E',
    accentColor: '#F59E0B',
    users: [
      { email: 'admin@other.test', name: 'Olive Admin', role: 'tenant_admin' },
      { email: 'attendee@other.test', name: 'Omar Haddad', role: 'attendee' },
    ],
  },
];

async function authTenantFor(displayName: string): Promise<string> {
  const { tenants: existing } = await auth.tenantManager().listTenants();
  const found = existing.find((t) => t.displayName === displayName);
  if (found) return found.tenantId;
  const created = await auth.tenantManager().createTenant({
    displayName,
    emailSignInConfig: { enabled: true, passwordRequired: true },
  });
  return created.tenantId;
}

async function seedTenant(t: TenantSeed) {
  const authTenantId = await authTenantFor(`${t.id}-pool`);
  await db.doc(`tenants/${t.id}`).set({
    name: t.name,
    status: 'active',
    authTenantId,
    domains: t.domains,
    commissionRate: 0.035,
    paymentConfig: {},
    branding: { name: t.name, primaryColor: t.primaryColor, accentColor: t.accentColor },
  });
  for (const host of t.domains) await db.doc(`tenantDomains/${host}`).set({ tenantId: t.id });

  const tenantAuth = auth.tenantManager().authForTenant(authTenantId);
  for (const u of t.users) {
    const existing = await tenantAuth.getUserByEmail(u.email).catch(() => null);
    const user =
      existing ??
      (await tenantAuth.createUser({
        email: u.email,
        password: SEED_PASSWORD,
        displayName: u.name,
        emailVerified: true,
      }));
    const claims: Record<string, string> = { role: u.role, tenantId: t.id };
    if (u.role === 'organizer') {
      const organizerId = `org-${user.uid.slice(0, 8)}`;
      claims.organizerId = organizerId;
      await db.doc(`tenants/${t.id}/organizers/${organizerId}`).set({
        name: 'Pulse Live',
        slug: 'pulse-live',
        bio: 'Independent promoter bringing indie, electronic and jazz acts to Brooklyn.',
        status: 'approved',
        ownerUid: user.uid,
      });
    }
    if (u.role === 'scanner') {
      await db.doc(`tenants/${t.id}/scannerAssignments/${user.uid}`).set({ eventIds: [], organizerId: null });
    }
    await tenantAuth.setCustomUserClaims(user.uid, claims);
    await db.doc(`users/${user.uid}`).set({
      tenantId: t.id,
      displayName: u.name,
      email: u.email,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`✓ ${t.id}: pool ${authTenantId}, ${t.users.length} users, domains ${t.domains.join(', ')}`);
}

for (const t of tenants) await seedTenant(t);
console.log(`\nAll seeded accounts use SEED_PASSWORD from scripts/seed-credentials.ts.`);
