'use client';

import { ref, uploadBytes } from 'firebase/storage';
import { getClientStorage } from '@/lib/firebase/client';
import { withFirebaseUser } from '@/lib/firebase/withUser';

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!TYPES[file.type]) return 'Use a JPG, PNG or WebP image.';
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 5 MB or smaller.';
  return null;
}

/** Uploads into `folder` (must end with "/") under a random name; returns the storage path. */
export async function uploadImage(authTenantId: string, folder: string, file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const name = `${crypto.randomUUID().replace(/-/g, '')}.${TYPES[file.type]}`;
  const path = `${folder}${name}`;
  await withFirebaseUser(authTenantId, () =>
    uploadBytes(ref(getClientStorage(), path), file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    }),
  );
  return path;
}
