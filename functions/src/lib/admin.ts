import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();

export const db = getFirestore();
export const auth = getAuth();
export const tenantAuth = (authTenantId: string) => auth.tenantManager().authForTenant(authTenantId);

/** True inside the Firebase Emulator Suite. */
export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
