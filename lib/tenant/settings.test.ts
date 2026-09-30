import { describe, expect, it } from 'vitest';
import { tenantSettingsInputSchema } from './settings';

const base = {
  name: 'Demo Tickets',
  primaryColor: '#5B2EE0',
  accentColor: '#FF6B4A',
  logoPath: null,
  supportEmail: 'help@demo.test',
  footerTagline: 'Live experiences.',
  socialLinks: { instagram: 'https://instagram.com/demo', tiktok: '', x: '', facebook: '', youtube: '' },
  commissionPercent: 3.5,
};

describe('tenantSettingsInputSchema', () => {
  it('accepts valid settings', () => {
    expect(tenantSettingsInputSchema.safeParse(base).success).toBe(true);
  });
  it('rejects non-https and script links', () => {
    for (const bad of ['http://x.com', 'javascript:alert(1)', 'instagram.com/x']) {
      expect(
        tenantSettingsInputSchema.safeParse({ ...base, socialLinks: { ...base.socialLinks, instagram: bad } })
          .success,
      ).toBe(false);
    }
  });
  it('rejects fields admins may not change here', () => {
    for (const extra of [
      { currency: 'EUR' },
      { status: 'suspended' },
      { authTenantId: 'x' },
      { timezone: 'UTC' },
    ]) {
      expect(tenantSettingsInputSchema.safeParse({ ...base, ...extra }).success).toBe(false);
    }
  });
  it('rejects invalid colours and commission', () => {
    expect(tenantSettingsInputSchema.safeParse({ ...base, primaryColor: 'red' }).success).toBe(false);
    expect(tenantSettingsInputSchema.safeParse({ ...base, commissionPercent: -1 }).success).toBe(false);
    expect(tenantSettingsInputSchema.safeParse({ ...base, commissionPercent: 80 }).success).toBe(false);
  });
});
