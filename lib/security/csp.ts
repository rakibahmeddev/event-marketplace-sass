/**
 * Content Security Policy for HTML responses, with a fresh nonce per request (set in proxy.ts; Next.js
 * puts the nonce on its own scripts). Scripts: only nonce'd scripts and what they load ('strict-dynamic'),
 * so injected inline scripts can't run. Styles keep 'unsafe-inline': React style attributes need it, and a
 * style nonce would make browsers ignore it.
 */
export function buildCsp({ nonce, isDev }: { nonce: string; isDev: boolean }): string {
  const google = 'https://apis.google.com https://www.google.com https://www.gstatic.com';
  const directives = [
    "default-src 'self'",
    // Hosts are a CSP2 fallback; CSP3 browsers use the nonce + strict-dynamic. Firebase Auth and App Check
    // (reCAPTCHA Enterprise) load their helper scripts dynamically, which strict-dynamic allows.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${google}${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://firebasestorage.googleapis.com${isDev ? ' http://127.0.0.1:9199' : ''}`,
    "font-src 'self'",
    [
      "connect-src 'self'",
      'https://*.googleapis.com',
      'https://*.firebaseio.com',
      'https://firebaseappcheck.googleapis.com',
      ...(isDev ? ['http://127.0.0.1:*', 'ws://127.0.0.1:*', 'http://localhost:*', 'ws://localhost:*'] : []),
    ].join(' '),
    [
      "frame-src 'self' https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com",
      ...(isDev ? ['http://127.0.0.1:*', 'http://localhost:*'] : []),
    ].join(' '),
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ];
  return directives.join('; ');
}

/** 128-bit random nonce, base64. Works in the Edge and Node runtimes. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** API routes and other non-HTML responses: nothing may load or frame them. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'";
