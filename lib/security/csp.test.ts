import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce } from './csp';

describe('CSP', () => {
  it('production: scripts need the nonce; no unsafe-inline / unsafe-eval for scripts', () => {
    const csp = buildCsp({ nonce: 'abc123', isDev: false });
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).toContain("'nonce-abc123'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain('unsafe-inline');
    expect(script).not.toContain('unsafe-eval');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('127.0.0.1');
  });

  it('development adds eval (React debugging) and the local emulators', () => {
    const csp = buildCsp({ nonce: 'n', isDev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('http://127.0.0.1:9199');
  });

  it('nonces are random and long enough', () => {
    const a = createNonce();
    expect(a).not.toBe(createNonce());
    expect(atob(a)).toHaveLength(16);
  });
});
