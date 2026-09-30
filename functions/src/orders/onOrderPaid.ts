import QRCode from 'qrcode';
import type { Timestamp } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { db } from '../lib/admin.js';
import { esc, sendEmail, siteUrl, type EmailAttachment } from '../lib/email.js';
import { signTicketPayload } from '../lib/qr.js';
import { EMAIL_FROM, QR_SIGNING_SECRET, RESEND_API_KEY } from '../lib/secrets.js';

type OrderItem = { ticketTypeId: string; name: string; unitPrice: number; quantity: number };

function money(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

/**
 * Order became `paid` (set by the webhook in the web app) → email the buyer their QR tickets
 * (design 05 "EMAIL TICKET"). Attendees with a different email get their own ticket.
 * Retries are safe: the trigger only fires on the pending→paid transition.
 */
export const onOrderPaid = onDocumentUpdated(
  {
    document: 'tenants/{tenantId}/orders/{orderId}',
    secrets: [QR_SIGNING_SECRET, RESEND_API_KEY],
    retry: false,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.status === 'paid' || after.status !== 'paid') return;
    const { tenantId, orderId } = event.params;

    const [tenantSnap, eventSnap, ticketsSnap] = await Promise.all([
      db.doc(`tenants/${tenantId}`).get(),
      db.doc(`tenants/${tenantId}/events/${after.eventId}`).get(),
      db.collection(`tenants/${tenantId}/tickets`).where('orderId', '==', orderId).get(),
    ]);
    const tenantName = (tenantSnap.get('branding.name') as string) ?? 'Tickets';
    const base = siteUrl(tenantSnap.get('domains'));
    const tz = (eventSnap.get('timezone') as string) ?? 'UTC';
    const start = (eventSnap.get('startAt') as Timestamp | null)?.toDate();
    const when = start
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }).format(start)
      : 'To be announced';
    const venue = eventSnap.get('isOnline')
      ? 'Online event'
      : [eventSnap.get('venue.name'), eventSnap.get('venue.city')].filter(Boolean).join(', ');
    const title = (eventSnap.get('title') as string) ?? 'your event';
    const secret = QR_SIGNING_SECRET.value();

    const tickets = ticketsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as { attendeeName: string; attendeeEmail: string; ticketTypeName: string }),
    }));
    const qr = async (id: string) =>
      QRCode.toBuffer(signTicketPayload(id, tenantId, secret), {
        type: 'png',
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

    const ticketBlock = (t: (typeof tickets)[number]) => `
      <tr><td style="padding:16px 0;border-top:1px solid #ECECF2">
        <p style="margin:0 0 4px;font:600 12px Arial;letter-spacing:.06em;text-transform:uppercase;color:#6B6B80">Attendee · Ticket</p>
        <p style="margin:0 0 12px;font:700 15px Arial;color:#1A1A2E">${esc(t.attendeeName)} · ${esc(t.ticketTypeName)}</p>
        <img src="cid:qr-${t.id}" width="180" height="180" alt="QR code for ticket ${t.id}" style="display:block;border:1px solid #ECECF2;border-radius:12px;padding:8px">
        <p style="margin:8px 0 0;font:600 13px monospace;color:#1A1A2E">${t.id}</p>
      </td></tr>`;

    const html = (
      list: typeof tickets,
      greeting: string,
    ) => `<!doctype html><html><body style="margin:0;background:#F7F7F9;font-family:Arial,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;padding:32px">
          <tr><td>
            <p style="margin:0 0 20px;font:800 20px Arial;color:#1A1A2E">${esc(tenantName)}</p>
            <p style="margin:0 0 6px;font:700 13px Arial;color:#12805C">Order confirmed · ${orderId.slice(0, 8).toUpperCase()}</p>
            <h1 style="margin:0 0 12px;font:800 24px Arial;color:#1A1A2E">Your tickets for ${esc(title)}</h1>
            <p style="margin:0 0 20px;font:15px/23px Arial;color:#4B4B63">${esc(greeting)} Show the QR code below at the entrance. Each ticket can be scanned once.</p>
            <p style="margin:0;font:14px Arial;color:#1A1A2E"><b>When</b> ${esc(when)}<br><b>Where</b> ${esc(venue)}</p>
          </td></tr>
          ${list.map(ticketBlock).join('')}
          <tr><td style="padding-top:20px">
            ${base ? `<a href="${base}/account/tickets" style="display:inline-block;background:#5B2EE0;color:#fff;text-decoration:none;font:600 15px Arial;padding:14px 22px;border-radius:10px">View tickets online</a>` : ''}
            <p style="margin:20px 0 0;font:12px Arial;color:#6B6B80">You can also download your tickets as a PDF from your account. Questions? Contact the organizer from the event page.</p>
          </td></tr>
        </table>
      </td></tr></table></body></html>`;

    const buyerEmail = (after.buyerEmail as string) || '';
    const buyerName = ((after.buyerName as string) || '').split(' ')[0];
    const from = EMAIL_FROM.value();
    const apiKey = RESEND_API_KEY.value();
    const items = (after.items as OrderItem[]).map((i) => `${i.quantity} × ${i.name}`).join(', ');

    const attach = async (list: typeof tickets): Promise<EmailAttachment[]> =>
      Promise.all(
        list.map(async (t) => ({
          filename: `ticket-${t.id}.png`,
          content: await qr(t.id),
          contentId: `qr-${t.id}`,
          contentType: 'image/png',
        })),
      );

    if (buyerEmail) {
      await sendEmail(
        {
          tenantId,
          to: buyerEmail,
          subject: `Your tickets for ${title}`,
          html: html(tickets, `Hi ${buyerName || 'there'}, you're all set.`),
          text: `Your tickets for ${title} (${items}, total ${money(after.total as number, after.currency as string)}). ${when} at ${venue}. View them at ${base}/account/tickets`,
          attachments: await attach(tickets),
        },
        apiKey,
        from,
      );
    }
    // Attendees with their own email get just their ticket.
    for (const t of tickets.filter((t) => t.attendeeEmail && t.attendeeEmail !== buyerEmail)) {
      await sendEmail(
        {
          tenantId,
          to: t.attendeeEmail,
          subject: `Your ticket for ${title}`,
          html: html(
            [t],
            `Hi ${t.attendeeName.split(' ')[0]}, ${after.buyerName || 'a friend'} got you a ticket.`,
          ),
          text: `Your ticket for ${title}. ${when} at ${venue}.`,
          attachments: await attach([t]),
        },
        apiKey,
        from,
      );
    }
  },
);
