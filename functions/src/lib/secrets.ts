import { defineSecret, defineString } from 'firebase-functions/params';

/** Secret Manager (production) / functions/.secret.local (emulator). */
export const QR_SIGNING_SECRET = defineSecret('QR_SIGNING_SECRET');
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
export const EMAIL_FROM = defineString('EMAIL_FROM', { default: 'Tickets <tickets@example.com>' });
