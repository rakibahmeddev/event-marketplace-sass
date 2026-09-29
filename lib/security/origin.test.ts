import { describe, expect, it } from 'vitest';
import { isSameOrigin } from './origin';

const h = (init: Record<string, string>) => new Headers(init);

describe('isSameOrigin', () => {
  it('accepts matching origin and host', () => {
    expect(isSameOrigin(h({ origin: 'http://demo.localhost:3000', host: 'demo.localhost:3000' }))).toBe(true);
  });
  it('rejects a different site', () => {
    expect(isSameOrigin(h({ origin: 'https://evil.com', host: 'demo.localhost:3000' }))).toBe(false);
  });
  it('rejects another tenant on the same platform', () => {
    expect(isSameOrigin(h({ origin: 'http://other.localhost:3000', host: 'demo.localhost:3000' }))).toBe(
      false,
    );
  });
  it('rejects a missing origin', () => {
    expect(isSameOrigin(h({ host: 'demo.localhost:3000' }))).toBe(false);
  });
});
