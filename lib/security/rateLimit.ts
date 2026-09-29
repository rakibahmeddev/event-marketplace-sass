import 'server-only';

import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

type Limit = { limit: number; windowSeconds: number };

/**
 * Fixed-window counter in rateLimits/{hash}. Server-only (rules deny all client access).
 * Keys are hashed so IPs / uids are not stored in clear. `expiresAt` is for a Firestore TTL policy.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, { limit, windowSeconds }: Limit): Promise<boolean> {
  const windowStart = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const id = createHash('sha256').update(`${key}|${windowStart}`).digest('hex');
  const ref = adminDb().collection('rateLimits').doc(id);
  return adminDb().runTransaction(async (tx) => {
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

/**
 * Client IP for rate limiting. Uses the LAST X-Forwarded-For entry — the one appended by
 * our hosting proxy. Earlier entries are client-controlled and would let callers dodge the limit.
 * Phase 7 re-checks this against the chosen host's proxy chain.
 */
export function clientIp(headers: Headers): string {
  const hops =
    headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? [];
  return hops.at(-1) || headers.get('x-real-ip') || 'unknown';
}
