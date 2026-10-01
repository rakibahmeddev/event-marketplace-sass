import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/firebase/admin', () => ({ adminDb: vi.fn() }));
const { clientIp } = await import('./rateLimit');

describe('clientIp', () => {
  it('uses the hop appended by our proxy, not a client-supplied one', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }), 0)).toBe('203.0.113.9');
  });
  it('behind a load balancer that appends itself, skips the trusted hops', () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 35.191.0.1' });
    expect(clientIp(h, 1)).toBe('203.0.113.9');
    // A client can't push its own entry past the trusted hops.
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.9, 35.191.0.1' }), 1)).toBe('203.0.113.9');
  });
  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientIp(new Headers({ 'x-real-ip': '198.51.100.2' }), 0)).toBe('198.51.100.2');
    expect(clientIp(new Headers(), 0)).toBe('unknown');
  });
});
