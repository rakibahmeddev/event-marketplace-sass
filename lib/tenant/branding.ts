import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected a 6-digit hex colour');

/** Non-secret branding stored on tenants/{tenantId}.branding */
export const tenantBrandingSchema = z
  .object({
    name: z.string().min(1).max(60),
    logoUrl: z.url().optional(),
    primaryColor: hexColor,
    accentColor: hexColor,
  })
  .strict();

export type TenantBranding = z.infer<typeof tenantBrandingSchema>;

/** Design-system defaults (design/01 Style Guide). */
export const DEFAULT_BRANDING: TenantBranding = {
  name: 'brandname',
  primaryColor: '#5B2EE0',
  accentColor: '#FF6B4A',
};

/**
 * CSS variables that override the defaults in app/globals.css.
 * Only the two base colours are sent; hover/tint shades are derived in CSS with
 * color-mix(), so the default theme keeps the exact hex values from the design.
 */
export function brandingToCssVars(branding: TenantBranding): Record<string, string> {
  const vars: Record<string, string> = {};
  if (branding.primaryColor.toLowerCase() !== DEFAULT_BRANDING.primaryColor.toLowerCase()) {
    vars['--brand-primary'] = branding.primaryColor;
    vars['--brand-primary-hover'] = `color-mix(in oklab, ${branding.primaryColor}, black 18%)`;
    vars['--brand-primary-100'] = `color-mix(in oklab, ${branding.primaryColor}, white 80%)`;
    vars['--brand-primary-50'] = `color-mix(in oklab, ${branding.primaryColor}, white 90%)`;
  }
  if (branding.accentColor.toLowerCase() !== DEFAULT_BRANDING.accentColor.toLowerCase()) {
    vars['--brand-accent'] = branding.accentColor;
    vars['--brand-accent-hover'] = `color-mix(in oklab, ${branding.accentColor}, black 8%)`;
    vars['--brand-accent-100'] = `color-mix(in oklab, ${branding.accentColor}, white 80%)`;
  }
  return vars;
}
