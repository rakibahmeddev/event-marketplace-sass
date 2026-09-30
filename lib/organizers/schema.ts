import { z } from 'zod';
import { organizerSlugPattern, RESERVED_SLUGS } from '@/lib/format/text';

export const imageRefSchema = z.object({ path: z.string().min(1), url: z.url() });
export type ImageRef = z.infer<typeof imageRefSchema>;

export const ORGANIZER_STATUSES = ['pending', 'approved', 'suspended'] as const;

/** tenants/{t}/organizers/{organizerId} */
export const organizerDocSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  logo: imageRefSchema.nullable().default(null),
  bio: z.string().default(''),
  status: z.enum(ORGANIZER_STATUSES),
  ownerUid: z.string().min(1),
  category: z.string().nullable().default(null),
  city: z.string().default(''),
  createdAt: z.date().nullable().default(null),
  approvedAt: z.date().nullable().default(null),
});
export type Organizer = z.infer<typeof organizerDocSchema> & { id: string };

export const organizerSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(organizerSlugPattern, 'Use 3–40 lowercase letters, numbers or hyphens')
  .refine((s) => !RESERVED_SLUGS.has(s), 'This URL is reserved');

/** "Become an organizer" step 2. */
export const organizerApplicationSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your organization name').max(60),
    slug: organizerSlugSchema,
    category: z.string().min(1, 'Choose a category').max(64),
    city: z.string().trim().min(2, 'Enter a city').max(60),
    bio: z.string().trim().max(600).default(''),
    logoPath: z.string().max(300).nullable(),
  })
  .strict();
export type OrganizerApplicationInput = z.infer<typeof organizerApplicationSchema>;

/** Dashboard → Settings. Slug is fixed once approved. */
export const organizerProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your organization name').max(60),
    city: z.string().trim().min(2, 'Enter a city').max(60),
    bio: z.string().trim().max(600),
    logoPath: z.string().max(300).nullable(),
  })
  .strict();
