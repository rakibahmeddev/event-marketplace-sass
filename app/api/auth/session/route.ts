import { NextResponse, type NextRequest } from 'next/server';
import { adminDb, tenantAuth } from '@/lib/firebase/admin';
import { claimsSchema } from '@/lib/auth/roles';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session';
import { clientIp, rateLimit } from '@/lib/security/rateLimit';
import { isSameOrigin } from '@/lib/security/origin';
import { getCurrentTenant } from '@/lib/tenant/current';
import { createSessionSchema } from '@/lib/validation/auth';

const RECENT_SIGN_IN_SECONDS = 5 * 60;
/** Sign-ins per client IP per minute. Higher outside production so local test runs (all from one IP) pass. */
const SESSION_LIMIT = process.env.NODE_ENV === 'production' ? 20 : 200;

const error = (status: number, code: string) => NextResponse.json({ error: code }, { status });

/** maxAge undefined → browser-session cookie ("Keep me logged in" unticked). The server-side expiry is 5 days either way. */
function cookieOptions(maxAge: number | undefined) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(maxAge === undefined ? {} : { maxAge }),
  };
}

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return error(403, 'bad_origin');
  const tenant = await getCurrentTenant();
  if (!tenant) return error(404, 'unknown_tenant');

  const allowed = await rateLimit(`session:${tenant.id}:${clientIp(request.headers)}`, {
    limit: SESSION_LIMIT,
    windowSeconds: 60,
  });
  if (!allowed) return error(429, 'rate_limited');

  const body = createSessionSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return error(400, 'invalid_request');

  const auth = tenantAuth(tenant.authTenantId);
  let decoded;
  try {
    decoded = await auth.verifyIdToken(body.data.idToken, true);
  } catch {
    return error(401, 'invalid_token');
  }

  const claims = claimsSchema.safeParse(decoded);
  if (
    decoded.firebase.tenant !== tenant.authTenantId ||
    !claims.success ||
    claims.data.tenantId !== tenant.id
  ) {
    return error(403, 'wrong_tenant');
  }
  if (Date.now() / 1000 - decoded.auth_time > RECENT_SIGN_IN_SECONDS) return error(401, 'stale_sign_in');

  // Registration sets the display name after the account exists; copy it into users/{uid} once.
  if (typeof decoded.name === 'string' && decoded.name.length > 0) {
    const userRef = adminDb().collection('users').doc(decoded.uid);
    const snap = await userRef.get();
    if (snap.exists && !snap.get('displayName'))
      await userRef.update({ displayName: decoded.name.slice(0, 80) });
  }

  const sessionCookie = await auth.createSessionCookie(body.data.idToken, {
    expiresIn: SESSION_MAX_AGE_SECONDS * 1000,
  });
  const response = NextResponse.json({ ok: true, role: claims.data.role });
  response.cookies.set(
    SESSION_COOKIE,
    sessionCookie,
    cookieOptions(body.data.remember ? SESSION_MAX_AGE_SECONDS : undefined),
  );
  return response;
}

/** Sign out: clear the cookie and revoke refresh tokens (signs out other devices too). */
export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request.headers)) return error(403, 'bad_origin');
  const tenant = await getCurrentTenant();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (tenant && cookie) {
    try {
      const auth = tenantAuth(tenant.authTenantId);
      const decoded = await auth.verifySessionCookie(cookie);
      await auth.revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid — clearing the cookie is enough.
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0));
  return response;
}
