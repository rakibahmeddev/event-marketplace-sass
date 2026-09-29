import { describe, expect, it } from 'vitest';
import { changePasswordSchema, createSessionSchema, registerFormSchema } from './auth';

describe('auth schemas', () => {
  it('rejects unknown fields on the session request', () => {
    expect(createSessionSchema.safeParse({ idToken: 'x'.repeat(40), role: 'tenant_admin' }).success).toBe(
      false,
    );
    expect(createSessionSchema.parse({ idToken: 'x'.repeat(40) }).remember).toBe(true);
  });
  it('requires 8+ character passwords on register', () => {
    const r = registerFormSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      password: 'short',
    });
    expect(r.success).toBe(false);
  });
  it('trims names', () => {
    const r = registerFormSchema.parse({
      firstName: ' Jordan ',
      lastName: 'Lee',
      email: 'j@x.co',
      password: 'longenough',
    });
    expect(r.firstName).toBe('Jordan');
  });
  it('rejects reusing the current password', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'samesame1', newPassword: 'samesame1' }).success,
    ).toBe(false);
  });
});
