import { z } from 'zod';
import { hexColor } from './branding';

export const SOCIAL_NETWORKS = ['instagram', 'tiktok', 'x', 'facebook', 'youtube'] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), 'Use a full https:// link');

/** Stored on tenants/{t}. */
export const socialLinksSchema = z.object(
  Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, z.string().optional()])) as Record<
    SocialNetwork,
    z.ZodOptional<z.ZodString>
  >,
);
export type SocialLinks = z.infer<typeof socialLinksSchema>;

/** Admin → Settings form. Unknown fields are rejected; currency and timezone are not editable here. */
export const tenantSettingsInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter a name').max(60),
    primaryColor: hexColor,
    accentColor: hexColor,
    logoPath: z.string().max(300).nullable(),
    supportEmail: z.union([z.email('Enter a valid email').max(254), z.literal('')]),
    footerTagline: z.string().trim().max(200),
    socialLinks: z
      .object(
        Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, httpsUrl])) as Record<
          SocialNetwork,
          typeof httpsUrl
        >,
      )
      .strict(),
    /** Percent, e.g. 3.5 → stored as 0.035. */
    commissionPercent: z.number().min(0, 'Can’t be negative').max(50, 'At most 50%').multipleOf(0.01),
  })
  .strict();
export type TenantSettingsInput = z.infer<typeof tenantSettingsInputSchema>;
