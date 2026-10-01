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
 * Client IP for rate limiting, from X-Forwarded-For. Entries before the client's are client-controlled, so we
 * count from the END: `trustedHops` = how many entries our own infrastructure appends after the client's IP.
 * - local / one proxy: 0 → the last entry
 * - Firebase App Hosting (Google load balancer appends "<client>, <load balancer>"): 1 → set TRUSTED_PROXY_HOPS=1
 * Check on a deployment with GET /api/health (it shows the IP the server sees for you).
 */
export function clientIp(
  headers: Headers,
  trustedHops = Number(process.env.TRUSTED_PROXY_HOPS ?? 0),
): string {
  const hops =
    headers
      .get('x-forwarded-for')
      ?.split(',')
      .map((h) => h.trim())
      .filter(Boolean) ?? [];
  const skip = Number.isInteger(trustedHops) && trustedHops > 0 ? trustedHops : 0;
  return hops.at(-1 - skip) || hops[0] || headers.get('x-real-ip') || 'unknown';
}
