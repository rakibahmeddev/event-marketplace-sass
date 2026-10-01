import 'server-only';

import QRCode from 'qrcode';
import { getSecret } from '@/lib/security/secrets';
import { signTicketPayload } from './qr-core';

async function secret(): Promise<string> {
  const s = await getSecret('QR_SIGNING_SECRET');
  if (!s || s.length < 32) throw new Error('QR_SIGNING_SECRET (32+ chars) is not configured');
  return s;
}

export async function ticketQrPayload(ticketId: string, tenantId: string): Promise<string> {
  return signTicketPayload(ticketId, tenantId, await secret());
}

/** Inline SVG (rendered on the server; the signing secret never reaches the browser). */
export async function ticketQrSvg(ticketId: string, tenantId: string, color = '#1A1A2E'): Promise<string> {
  return QRCode.toString(await ticketQrPayload(ticketId, tenantId), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: color, light: '#FFFFFF' },
  });
}

export async function ticketQrPng(ticketId: string, tenantId: string): Promise<Buffer> {
  return QRCode.toBuffer(await ticketQrPayload(ticketId, tenantId), {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 600,
  });
}
