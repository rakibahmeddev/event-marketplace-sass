import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Baseline CSP. Phase 7 tightens script-src to nonces.
// Fonts are self-hosted by next/font and icons are bundled SVGs, so no third-party
// style/font origins are needed.
const csp = [
  "default-src 'self'",
  // apis.google.com: Firebase Auth popup helper. www.google.com / www.gstatic.com: reCAPTCHA Enterprise (App Check).
  `script-src 'self' 'unsafe-inline' https://apis.google.com https://www.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com",
  "font-src 'self'",
  [
    "connect-src 'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://firebaseappcheck.googleapis.com',
    ...(isDev ? ['http://127.0.0.1:*', 'ws://127.0.0.1:*', 'http://localhost:*', 'ws://localhost:*'] : []),
  ].join(' '),
  // *.firebaseapp.com: Firebase Auth helper iframe / popup handler; google.com: reCAPTCHA.
  [
    "frame-src 'self' https://*.firebaseapp.com https://www.google.com https://recaptcha.google.com",
    ...(isDev ? ['http://127.0.0.1:*', 'http://localhost:*'] : []),
  ].join(' '),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Camera is needed by the scanner page only; everything else is off.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // E2E runs a second dev server with its own build dir (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Dev only: the Storage emulator serves images from 127.0.0.1. remotePatterns still pins the host.
    dangerouslyAllowLocalIP: isDev,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      ...(isDev ? [{ protocol: 'http' as const, hostname: '127.0.0.1', port: '9199' }] : []),
    ],
  },
  // Pin the workspace root; otherwise a stray lockfile in a parent folder is picked up.
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
