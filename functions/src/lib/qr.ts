import { createHmac } from 'node:crypto';

/** Same payload format as lib/tickets/qr-core.ts in the web app (kept in sync by a shared test vector). */
export function signTicketPayload(ticketId: string, tenantId: string, secret: string): string {
  if (secret.length < 32) throw new Error('QR signing secret must be at least 32 characters');
  const sig = createHmac('sha256', secret).update(`${ticketId}.${tenantId}`).digest('base64url');
  return `${ticketId}.${tenantId}.${sig}`;
}
