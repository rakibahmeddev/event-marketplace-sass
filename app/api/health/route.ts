import { clientIp } from '@/lib/security/rateLimit';

/**
 * Liveness probe for deploys and test runners. Skips tenant resolution (see proxy.ts matcher). No data —
 * `yourIp` echoes the caller's own address as the rate limiter sees it (to verify TRUSTED_PROXY_HOPS).
 */
export function GET(request: Request) {
  return Response.json({ ok: true, yourIp: clientIp(request.headers) });
}
