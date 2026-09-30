'use client';

import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { getClientFunctions } from './client';
import { withFirebaseUser } from './withUser';

/** Calls a Cloud Function as the signed-in user. Returns a user-facing error message on failure. */
export async function callFunction<T>(
  authTenantId: string,
  name: string,
  data: unknown,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await withFirebaseUser(authTenantId, () =>
      httpsCallable<unknown, T>(getClientFunctions(), name)(data),
    );
    return { ok: true, data: res.data };
  } catch (err) {
    const message =
      err instanceof FirebaseError || err instanceof Error ? err.message : 'Something went wrong.';
    return {
      ok: false,
      error: message.replace(/^Firebase: |\s*\(functions\/[a-z-]+\)\.?$/g, '') || 'Something went wrong.',
    };
  }
}
