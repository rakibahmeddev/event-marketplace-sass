import 'server-only';

import { randomUUID } from 'node:crypto';
import { adminBucket } from '@/lib/firebase/admin';
import type { ImageRef } from '@/lib/organizers/schema';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Storage folders. Uploads are only accepted inside the caller's own folder (see storage.rules). */
export const storagePaths = {
  eventImages: (tenantId: string, organizerId: string, eventId: string) =>
    `tenants/${tenantId}/organizers/${organizerId}/events/${eventId}/`,
  organizerLogo: (tenantId: string, organizerId: string) =>
    `tenants/${tenantId}/organizers/${organizerId}/logo/`,
  applicationLogo: (tenantId: string, uid: string) => `tenants/${tenantId}/applications/${uid}/`,
};

/**
 * Turns a client-supplied storage path into an ImageRef, but only if it lies inside one of
 * `allowedPrefixes`, exists, and is an image within the size limit. The download URL is always
 * generated here — URLs from the browser are never trusted.
 */
export async function resolveImage(path: string, allowedPrefixes: string[]): Promise<ImageRef | null> {
  if (path.includes('..') || !allowedPrefixes.some((p) => path.startsWith(p))) return null;
  const file = adminBucket().file(path);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [meta] = await file.getMetadata();
  if (!IMAGE_TYPES.has(String(meta.contentType)) || Number(meta.size) > MAX_IMAGE_BYTES) return null;

  // Same URL format as firebase-admin's getDownloadURL(), built from the object metadata. (getDownloadURL
  // goes through the client endpoint, which the Storage emulator guards with security rules.)
  let token = String(meta.metadata?.firebaseStorageDownloadTokens ?? '').split(',')[0];
  if (!token) {
    token = randomUUID();
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  }
  const origin =
    process.env.STORAGE_EMULATOR_HOST ??
    (process.env.FIREBASE_STORAGE_EMULATOR_HOST
      ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`
      : 'https://firebasestorage.googleapis.com');
  return {
    path,
    url: `${origin}/v0/b/${file.bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`,
  };
}
