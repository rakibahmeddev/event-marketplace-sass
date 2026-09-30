import { NextResponse, type NextRequest } from 'next/server';
import { normalizeHost } from '@/lib/tenant/host';
import { getTenantById, tenantIdForHost } from '@/lib/tenant/repository';
import { PATHNAME_HEADER, TENANT_HEADER } from '@/lib/tenant/headers';

const NOT_FOUND_PATH = '/tenant-not-found';
/** Lookups are cached, so this only bites when Firestore is unreachable (it retries for a long time). */
const LOOKUP_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Tenant lookup timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Resolves the tenant from the hostname (custom domain or platform subdomain —
 * both are docs in tenantDomains/{hostname}) and forwards it to the app as a
 * request header. Authorization is NOT done here; layouts and server code check sessions.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  // Never trust these from the client.
  requestHeaders.delete(TENANT_HEADER);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);

  const hostname = normalizeHost(request.headers.get('host'));
  let tenant;
  try {
    tenant = await withTimeout(
      (async () => {
        const tenantId = hostname ? await tenantIdForHost(hostname) : null;
        return tenantId ? await getTenantById(tenantId) : null;
      })(),
      LOOKUP_TIMEOUT_MS,
    );
  } catch (err) {
    // Firestore unreachable (in development: emulators not running). Fail closed, without a stack trace.
    console.error('Tenant lookup failed', err instanceof Error ? err.message : err);
    const body =
      process.env.NODE_ENV === 'production'
        ? 'Service temporarily unavailable'
        : 'Cannot reach Firestore. Start the local emulators: `npm run dev:all` (or `npm run emulators`).';
    return new NextResponse(body, {
      status: 503,
      headers: { 'content-type': 'text/plain', 'retry-after': '30' },
    });
  }

  if (!tenant || tenant.status !== 'active') {
    if (request.nextUrl.pathname === NOT_FOUND_PATH) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    const url = request.nextUrl.clone();
    url.pathname = NOT_FOUND_PATH;
    url.search = '';
    return NextResponse.rewrite(url, { request: { headers: requestHeaders }, status: 404 });
  }

  requestHeaders.set(TENANT_HEADER, tenant.id);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Skip static assets, Next internals and the liveness probe.
  matcher: [
    '/((?!_next/static|_next/image|__nextjs|api/health$|api/webhooks/|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)',
  ],
};
