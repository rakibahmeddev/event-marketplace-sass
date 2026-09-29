import { deleteApp, initializeApp as initClientApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { SEED_PASSWORD } from '../../scripts/seed-credentials';

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

const PROJECT = 'demo-ticketing';
if (!getApps().length) initializeApp({ projectId: PROJECT });
export const adminAuth = getAdminAuth();
export const db = getFirestore();

export { SEED_PASSWORD } from '../../scripts/seed-credentials';

export async function authTenantIdOf(tenantId: string): Promise<string> {
  return (await db.doc(`tenants/${tenantId}`).get()).get('authTenantId') as string;
}

const apps: FirebaseApp[] = [];

/** A fresh browser-like client bound to one Identity Platform tenant. */
export function clientFor(authTenantId: string) {
  const app = initClientApp(
    { apiKey: 'demo-api-key', projectId: PROJECT, appId: 'demo-app' },
    `c${apps.length}-${Date.now()}`,
  );
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  auth.tenantId = authTenantId;
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return {
    auth,
    signIn: (email: string, password = SEED_PASSWORD) => signInWithEmailAndPassword(auth, email, password),
    setUserRole: httpsCallable<
      { uid: string; role: string; organizerId?: string },
      { ok: boolean; role: string }
    >(functions, 'setUserRole'),
  };
}

export async function cleanupClients() {
  await Promise.all(apps.splice(0).map((a) => deleteApp(a)));
}

export const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
