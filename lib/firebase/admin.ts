import 'server-only';

import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type TenantAwareAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

/** FIREBASE_CONFIG is set by Firebase App Hosting (and Cloud Functions); local runs use the explicit vars. */
function firebaseConfig(): { projectId?: string; storageBucket?: string } {
  try {
    return process.env.FIREBASE_CONFIG ? (JSON.parse(process.env.FIREBASE_CONFIG) as object) : {};
  } catch {
    return {};
  }
}

// With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set (see .env.example) the Admin SDK talks to the
// local emulators. Deployed on App Hosting it uses the backend's own service account through Application
// Default Credentials — no key files.
function adminApp(): App {
  const config = firebaseConfig();
  return (
    getApps()[0] ??
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID ?? config.projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? config.storageBucket,
    })
  );
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
export const adminBucket = () => getStorage(adminApp()).bucket();

/** Auth scoped to one marketplace's Identity Platform tenant (its own user pool). */
export const tenantAuth = (authTenantId: string): TenantAwareAuth =>
  adminAuth().tenantManager().authForTenant(authTenantId);
