'use client';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getClientAuth } from '@/lib/firebase/client';

export class AuthActionError extends Error {}

/** Friendly, non-enumerating messages for Firebase Auth errors. */
export function authErrorMessage(err: unknown): string {
  if (err instanceof AuthActionError) return err.message;
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 8 characters).';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      // Rejections from the beforeUserCreated blocking function arrive as auth/internal-error.
      // Production puts BLOCKING_FUNCTION_ERROR_RESPONSE in the message; the emulator the HTTP 403 body.
      if (
        code === 'auth/internal-error' &&
        /BLOCKING_FUNCTION|PERMISSION_DENIED/.test(String((err as Error).message))
      ) {
        return 'This marketplace is not accepting sign-ups right now.';
      }
      return 'Something went wrong. Please try again.';
  }
}

/** Swap the Firebase user for a server session cookie, then drop the in-memory client user. */
async function startSession(user: User, authTenantId: string, remember = true): Promise<void> {
  const idToken = await user.getIdToken(true);
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken, remember }),
  });
  await signOut(getClientAuth(authTenantId));
  if (!res.ok) {
    const code = ((await res.json().catch(() => ({}))) as { error?: string }).error;
    throw new AuthActionError(
      code === 'rate_limited'
        ? 'Too many attempts. Wait a minute and try again.'
        : 'Could not sign you in. Please try again.',
    );
  }
}

export async function loginWithEmail(
  authTenantId: string,
  email: string,
  password: string,
  remember: boolean,
) {
  const cred = await signInWithEmailAndPassword(getClientAuth(authTenantId), email, password);
  await startSession(cred.user, authTenantId, remember);
}

export async function loginWithGoogle(authTenantId: string) {
  const cred = await signInWithPopup(getClientAuth(authTenantId), new GoogleAuthProvider());
  await startSession(cred.user, authTenantId);
}

export async function registerWithEmail(
  authTenantId: string,
  input: { firstName: string; lastName: string; email: string; password: string },
) {
  const cred = await createUserWithEmailAndPassword(getClientAuth(authTenantId), input.email, input.password);
  await updateProfile(cred.user, { displayName: `${input.firstName} ${input.lastName}` });
  await startSession(cred.user, authTenantId);
}

/** Always resolves — the UI shows the same message whether or not the account exists. */
export async function requestPasswordReset(authTenantId: string, email: string) {
  try {
    await sendPasswordResetEmail(getClientAuth(authTenantId), email);
  } catch (err) {
    if (err instanceof FirebaseError && err.code === 'auth/too-many-requests') throw err;
  }
}

/**
 * Signing in with the current password doubles as the recent re-authentication
 * Firebase requires. Changing the password revokes existing sessions, so a fresh one is issued.
 */
export async function changePassword(
  authTenantId: string,
  email: string,
  currentPassword: string,
  newPassword: string,
) {
  const cred = await signInWithEmailAndPassword(getClientAuth(authTenantId), email, currentPassword);
  await updatePassword(cred.user, newPassword);
  await startSession(cred.user, authTenantId);
}

export async function logout() {
  await fetch('/api/auth/session', { method: 'DELETE' });
}
