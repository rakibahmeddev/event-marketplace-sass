import type { NextConfig } from 'next';
import { API_CSP } from './lib/security/csp';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Firebase web config. Firebase App Hosting provides it at build time as FIREBASE_WEBAPP_CONFIG; locally the
 * NEXT_PUBLIC_FIREBASE_* values in .env.local win. Public by design (identifies the project, grants nothing).
 */
const webapp = (() => {
  try {
    return JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG ?? '{}') as Record<string, string | undefined>;
  } catch {
    return {};
  }
})();
const firebasePublicEnv = Object.fromEntries(
  Object.entries({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || webapp.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || webapp.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || webapp.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || webapp.storageBucket,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || webapp.appId,
  }).filter((e): e is [string, string] => !!e[1]),
);

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
  env: firebasePublicEnv,
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
        pathname: `/v0/b/${firebasePublicEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'unset'}/o/**`,
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
