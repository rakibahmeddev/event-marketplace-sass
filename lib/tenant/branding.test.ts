import { describe, expect, it } from 'vitest';
import { brandingToCssVars, DEFAULT_BRANDING, tenantBrandingSchema } from './branding';

describe('tenantBrandingSchema', () => {
  it('accepts the default branding', () => {
    expect(tenantBrandingSchema.parse(DEFAULT_BRANDING)).toEqual(DEFAULT_BRANDING);
  });

  it('rejects unknown fields', () => {
    expect(() => tenantBrandingSchema.parse({ ...DEFAULT_BRANDING, commissionRate: 0 })).toThrow();
  });

  it('rejects non-hex colours (no CSS injection through branding)', () => {
    expect(() =>
      tenantBrandingSchema.parse({ ...DEFAULT_BRANDING, primaryColor: 'red; background:url(x)' }),
    ).toThrow();
  });
});

describe('brandingToCssVars', () => {
  it('emits nothing for the default theme', () => {
    expect(brandingToCssVars(DEFAULT_BRANDING)).toEqual({});
  });

  it('overrides primary and derives its shades', () => {
    const vars = brandingToCssVars({ ...DEFAULT_BRANDING, primaryColor: '#0F766E' });
    expect(vars['--brand-primary']).toBe('#0F766E');
    expect(vars['--brand-primary-hover']).toContain('#0F766E');
    expect(vars['--brand-accent']).toBeUndefined();
  });
});
