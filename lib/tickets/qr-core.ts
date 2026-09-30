import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * QR payload: `${ticketId}.${tenantId}.${signature}` where signature = base64url(HMAC-SHA256(secret, "ticketId.tenantId")).
 * No personal data. The same algorithm lives in functions/src/lib/qr.ts (shared test vector keeps them in sync).
 */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function signTicketPayload(ticketId: string, tenantId: string, secret: string): string {
  if (!ID.test(ticketId) || !ID.test(tenantId)) throw new Error('Invalid ticket or tenant id');
  if (secret.length < 32) throw new Error('QR signing secret must be at least 32 characters');
  const sig = createHmac('sha256', secret).update(`${ticketId}.${tenantId}`).digest('base64url');
  return `${ticketId}.${tenantId}.${sig}`;
}

/** Returns the ids if the signature is valid, otherwise null. Constant-time comparison. */
export function verifyTicketPayload(
  payload: string,
  secret: string,
): { ticketId: string; tenantId: string } | null {
  const parts = payload.trim().split('.');
  if (parts.length !== 3) return null;
  const [ticketId, tenantId, sig] = parts as [string, string, string];
  if (!ID.test(ticketId) || !ID.test(tenantId)) return null;
  const expected = createHmac('sha256', secret).update(`${ticketId}.${tenantId}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { ticketId, tenantId };
}
