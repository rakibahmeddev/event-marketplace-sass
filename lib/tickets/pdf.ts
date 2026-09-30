import 'server-only';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { ticketQrPng } from './qr';

export type PdfTicket = {
  ticketId: string;
  eventTitle: string;
  dateLine: string;
  venueLine: string;
  attendeeName: string;
  ticketTypeName: string;
  orderLabel: string;
};

const INK = rgb(26 / 255, 26 / 255, 46 / 255);
const SLATE = rgb(107 / 255, 107 / 255, 128 / 255);

/** One A6-ish page per ticket with the signed QR. Text is drawn with standard fonts (no uploads). */
export async function ticketsPdf(
  tenantId: string,
  tenantName: string,
  tickets: PdfTicket[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${tenantName} tickets`);
  doc.setCreator(tenantName);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  // Standard fonts are WinAnsi only; replace anything else so a stray emoji can't break the PDF.
  const safe = (s: string) =>
    s.replace(/[^\x20-\x7E -ÿ]/g, (c) => ({ '—': '-', '–': '-', '’': "'", '·': '-' })[c] ?? '?');

  for (const [i, t] of tickets.entries()) {
    const page = doc.addPage([298, 460]);
    const { width, height } = page.getSize();
    let y = height - 36;
    const text = (s: string, size: number, font = regular, color = INK) => {
      page.drawText(safe(s), { x: 24, y, size, font, color, maxWidth: width - 48 });
      y -= size + 8;
    };
    text(tenantName, 12, bold);
    y -= 6;
    text(t.eventTitle.slice(0, 60), 15, bold);
    text(t.dateLine, 10, regular, SLATE);
    text(t.venueLine.slice(0, 70), 10, regular, SLATE);
    y -= 4;
    text(`Attendee: ${t.attendeeName}`, 10);
    text(`Ticket: ${t.ticketTypeName}`, 10);
    const png = await doc.embedPng(await ticketQrPng(t.ticketId, tenantId));
    const size = 190;
    page.drawImage(png, { x: (width - size) / 2, y: 60, width: size, height: size });
    page.drawText(safe(`${t.orderLabel} - Ticket ${i + 1} of ${tickets.length}`), {
      x: 24,
      y: 36,
      size: 9,
      font: regular,
      color: SLATE,
    });
    page.drawText(safe(t.ticketId), { x: 24, y: 22, size: 9, font: bold, color: INK });
  }
  return doc.save();
}
