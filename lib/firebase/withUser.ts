'use client';

import { signInWithCustomToken, signOut } from 'firebase/auth';
import { getClientToken } from '@/lib/auth/clientToken';
import { getClientAuth } from './client';

/**
 * Runs `fn` with a short-lived Firebase sign-in (custom token from the server session), then
 * signs out again. Storage rules and callable functions see the user's real claims.
 */
export async function withFirebaseUser<T>(authTenantId: string, fn: () => Promise<T>): Promise<T> {
  const res = await getClientToken();
  if ('error' in res) throw new Error(res.error);
  const auth = getClientAuth(authTenantId);
  await signInWithCustomToken(auth, res.token);
  try {
    return await fn();
  } finally {
    await signOut(auth);
  }
}

/**
 * Keeps a Firebase sign-in for long-lived screens (the scanner): signs in once with a custom token
 * from the server session; the SDK refreshes ID tokens on its own. Call `signOut` when leaving.
 */
export async function ensureFirebaseUser(authTenantId: string): Promise<void> {
  const auth = getClientAuth(authTenantId);
  if (auth.currentUser) return;
  const res = await getClientToken();
  if ('error' in res) throw new Error(res.error);
  await signInWithCustomToken(auth, res.token);
}
