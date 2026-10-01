import 'server-only';

import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type TenantAwareAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { prepareGoogleCredentials } from './gcp-auth';

// With FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST set (see .env.example)
// the Admin SDK talks to the local emulators. In production (Vercel) it uses Application Default
// Credentials from Workload Identity Federation (./gcp-auth.ts) — no key files.
function adminApp(): App {
  // Vercel: keyless credentials from the request's OIDC token (no-op locally and in tests).
  prepareGoogleCredentials();
  return (
    getApps()[0] ??
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      // Without a key file, createCustomToken signs through the IAM API as this account.
      ...(process.env.GCP_SERVICE_ACCOUNT_EMAIL
        ? { serviceAccountId: process.env.GCP_SERVICE_ACCOUNT_EMAIL }
        : {}),
    })
  );
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());
export const adminBucket = () => getStorage(adminApp()).bucket();

/** Auth scoped to one marketplace's Identity Platform tenant (its own user pool). */
export const tenantAuth = (authTenantId: string): TenantAwareAuth =>
  adminAuth().tenantManager().authForTenant(authTenantId);
