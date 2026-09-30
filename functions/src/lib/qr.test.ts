import { describe, expect, it } from 'vitest';
import { signTicketPayload, verifyTicketPayload } from './qr';

describe('functions QR signing', () => {
  it('matches the web app / openssl test vector', () => {
    expect(signTicketPayload('tk123', 'demo', 'test-secret-that-is-at-least-32-characters!')).toBe(
      'tk123.demo.x8m-ur56Y8AvDELG2_nT-KzQ8NiADX5XgM1Sb2tbSHI',
    );
  });

  it('verifies and rejects tampering', () => {
    const secret = 'test-secret-that-is-at-least-32-characters!';
    const p = signTicketPayload('tk123', 'demo', secret);
    expect(verifyTicketPayload(p, secret)).toEqual({ ticketId: 'tk123', tenantId: 'demo' });
    expect(verifyTicketPayload(p.replace('tk123', 'tk124'), secret)).toBeNull();
    expect(verifyTicketPayload(p, `${secret}x`)).toBeNull();
    expect(verifyTicketPayload('nope', secret)).toBeNull();
  });
});
