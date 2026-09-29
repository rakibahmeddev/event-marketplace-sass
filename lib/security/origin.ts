/**
 * CSRF check for cookie-authenticated mutations: the Origin header must be
 * present and point at the same host the request was sent to.
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  const host = headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
