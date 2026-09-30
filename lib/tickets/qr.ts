import 'server-only';

import QRCode from 'qrcode';
import { signTicketPayload } from './qr-core';

function secret(): string {
  const s = process.env.QR_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error('QR_SIGNING_SECRET (32+ chars) is not configured');
  return s;
}

export function ticketQrPayload(ticketId: string, tenantId: string): string {
  return signTicketPayload(ticketId, tenantId, secret());
}

/** Inline SVG (rendered on the server; the signing secret never reaches the browser). */
export async function ticketQrSvg(ticketId: string, tenantId: string, color = '#1A1A2E'): Promise<string> {
  return QRCode.toString(ticketQrPayload(ticketId, tenantId), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: color, light: '#FFFFFF' },
  });
}

export async function ticketQrPng(ticketId: string, tenantId: string): Promise<Buffer> {
  return QRCode.toBuffer(ticketQrPayload(ticketId, tenantId), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 600,
  });
}
