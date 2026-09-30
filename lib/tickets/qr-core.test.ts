import { describe, expect, it } from 'vitest';
import { signTicketPayload, verifyTicketPayload } from './qr-core';

const SECRET = 'test-secret-that-is-at-least-32-characters!';

describe('ticket QR payload', () => {
  it('matches an independent openssl test vector (same as functions/src/lib/qr.test.ts)', () => {
    expect(signTicketPayload('tk123', 'demo', SECRET)).toBe(
      'tk123.demo.' + 'x8m-ur56Y8AvDELG2_nT-KzQ8NiADX5XgM1Sb2tbSHI',
    );
  });
  it('round-trips', () => {
    expect(verifyTicketPayload(signTicketPayload('tk123', 'demo', SECRET), SECRET)).toEqual({
      ticketId: 'tk123',
      tenantId: 'demo',
    });
  });
  it('rejects tampering, other tenants and wrong secrets', () => {
    const p = signTicketPayload('tk123', 'demo', SECRET);
    expect(verifyTicketPayload(p.replace('tk123', 'tk124'), SECRET)).toBeNull();
    expect(verifyTicketPayload(p.replace('.demo.', '.other.'), SECRET)).toBeNull();
    expect(verifyTicketPayload(p, `${SECRET}x`)).toBeNull();
    expect(verifyTicketPayload('garbage', SECRET)).toBeNull();
    expect(verifyTicketPayload(`${p}.extra`, SECRET)).toBeNull();
  });
  it('contains no personal data', () => {
    expect(signTicketPayload('tk123', 'demo', SECRET)).not.toMatch(/@/);
  });
});
