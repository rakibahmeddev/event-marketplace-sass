import type { NextConfig } from 'next';
import { API_CSP } from './lib/security/csp';

const isDev = process.env.NODE_ENV !== 'production';

// The page CSP (with a per-request script nonce) is set in proxy.ts — see lib/security/csp.ts.
// Responses the proxy doesn't handle (API routes, webhooks, health) get a deny-all policy here.
const securityHeaders = [
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
      // Only our own bucket — not any Firebase project's files through our image optimizer.
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: `/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'unset'}/o/**`,
      },
      ...(isDev ? [{ protocol: 'http' as const, hostname: '127.0.0.1', port: '9199' }] : []),
    ],
  },
  // Pin the workspace root; otherwise a stray lockfile in a parent folder is picked up.
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
    ];
  },
};

export default nextConfig;
