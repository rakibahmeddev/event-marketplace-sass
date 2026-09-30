import { createHmac, timingSafeEqual } from 'node:crypto';

/** Same payload format as lib/tickets/qr-core.ts in the web app (kept in sync by a shared test vector). */
export function signTicketPayload(ticketId: string, tenantId: string, secret: string): string {
  if (secret.length < 32) throw new Error('QR signing secret must be at least 32 characters');
  const sig = createHmac('sha256', secret).update(`${ticketId}.${tenantId}`).digest('base64url');
  return `${ticketId}.${tenantId}.${sig}`;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Returns the ids if the signature is valid (constant-time compare), otherwise null. */
export function verifyTicketPayload(
  payload: string,
  secret: string,
): { ticketId: string; tenantId: string } | null {
  const parts = payload.trim().split('.');
  if (parts.length !== 3) return null;
  const [ticketId, tenantId, sig] = parts as [string, string, string];
  if (!ID.test(ticketId) || !ID.test(tenantId)) return null;
  const expected = createHmac('sha256', secret).update(`${ticketId}.${tenantId}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { ticketId, tenantId };
}
