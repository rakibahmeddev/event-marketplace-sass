import { describe, expect, it } from 'vitest';
import { signTicketPayload } from './qr';

describe('functions QR signing', () => {
  it('matches the web app / openssl test vector', () => {
    expect(signTicketPayload('tk123', 'demo', 'test-secret-that-is-at-least-32-characters!')).toBe(
      'tk123.demo.x8m-ur56Y8AvDELG2_nT-KzQ8NiADX5XgM1Sb2tbSHI',
    );
  });
});
