/**
 * Normalises a Host header to the key used in tenantDomains/{hostname}:
 * lowercase, port and trailing dot removed. Returns null for anything that is
 * not a plausible hostname (so it can never be used to address another document).
 */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  let h = host.trim().toLowerCase();
  if (h.startsWith('[')) return null; // IPv6 literals are not tenant domains
  h = h.replace(/:\d+$/, '').replace(/\.$/, '');
  if (h.length === 0 || h.length > 253) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(h)) return null;
  return h;
}
