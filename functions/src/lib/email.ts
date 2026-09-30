import { FieldValue } from 'firebase-admin/firestore';
import { db, isEmulator } from './admin.js';

export type EmailAttachment = { filename: string; content: Buffer; contentId?: string; contentType?: string };
export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  tenantId: string;
};

/** Escapes user-supplied text before it goes into HTML email. */
export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/**
 * Sends through Resend's HTTP API (no SDK). In the emulator — or without a real key — the email is
 * written to devEmails/{id} (emulator-only collection) so it can be inspected in the Emulator UI.
 */
export async function sendEmail(email: Email, apiKey: string | undefined, from: string): Promise<void> {
  if (isEmulator || !apiKey || apiKey === 'dev') {
    await db.collection('devEmails').add({
      to: email.to,
      subject: email.subject,
      html: email.html,
      attachments: (email.attachments ?? []).map((a) => a.filename),
      tenantId: email.tenantId,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`[email:dev] to=${email.to} subject="${email.subject}"`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${email.tenantId}:${email.subject}:${email.to}`.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString('base64'),
        ...(a.contentId ? { content_id: a.contentId } : {}),
        ...(a.contentType ? { content_type: a.contentType } : {}),
      })),
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Public base URL of a tenant's marketplace (first domain), or the local dev server. */
export function siteUrl(domains: unknown): string {
  if (isEmulator) return 'http://localhost:3000';
  const first = Array.isArray(domains)
    ? domains.find((d) => typeof d === 'string' && !d.includes('localhost'))
    : undefined;
  return first ? `https://${first}` : '';
}
