import 'server-only';

import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type TenantAwareAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set (see .env.example)
// the Admin SDK talks to the local emulators. In production it uses the runtime's
// default service account — no key files.
function adminApp(): App {
  return getApps()[0] ?? initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

/** Auth scoped to one marketplace's Identity Platform tenant (its own user pool). */
export const tenantAuth = (authTenantId: string): TenantAwareAuth =>
  adminAuth().tenantManager().authForTenant(authTenantId);
