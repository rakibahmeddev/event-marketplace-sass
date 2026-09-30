'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  browserPopupRedirectResolver,
  connectAuthEmulator,
  inMemoryPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

// Public web config — identifies the project, grants no access on its own.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let firestore: Firestore | undefined;

function firebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(config);
  if (recaptchaSiteKey) {
    if (useEmulators) {
      // Debug provider for local work; register the printed token in the console if needed.
      (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
        process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN || true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return app;
}

/**
 * Browser Auth bound to this marketplace's Identity Platform tenant.
 * Persistence is in-memory: the httpOnly session cookie is the source of truth,
 * so no tokens are left in localStorage/IndexedDB.
 */
export function getClientAuth(authTenantId: string): Auth {
  if (!auth) {
    auth = initializeAuth(firebaseApp(), {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  auth.tenantId = authTenantId;
  return auth;
}

export function getClientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(firebaseApp());
    if (useEmulators) connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return storage;
}

export function getClientFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(firebaseApp(), 'us-central1');
    if (useEmulators) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  return functions;
}

export function getClientDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(firebaseApp());
    if (useEmulators) connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  }
  return firestore;
}
