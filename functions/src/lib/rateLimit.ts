import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from './admin.js';

/** Same fixed-window counter as lib/security/rateLimit.ts in the Next.js app (rateLimits/{hash}). */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const id = createHash('sha256').update(`${key}|${windowStart}`).digest('hex');
  const ref = db.collection('rateLimits').doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.get('count') as number | undefined) ?? 0;
    if (count >= limit) return false;
    tx.set(
      ref,
      {
        count: FieldValue.increment(1),
        expiresAt: Timestamp.fromMillis((windowStart + windowSeconds * 2) * 1000),
      },
      { merge: true },
    );
    return true;
  });
}
