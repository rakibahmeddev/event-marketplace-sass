import { z } from 'zod';

/** Icon keys the admin can choose from (mapped to Font Awesome in components/events/categoryIcons.ts). */
export const CATEGORY_ICONS = [
  'music',
  'sports',
  'workshop',
  'festival',
  'conference',
  'nightlife',
  'comedy',
  'arts',
  'food',
  'family',
  'tech',
  'other',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/** tenants/{t}/categories/{categoryId} */
export const categoryDocSchema = z.object({
  name: z.string().min(1).max(40),
  slug: z.string().min(1).max(60),
  icon: z.enum(CATEGORY_ICONS),
  order: z.number().int(),
  active: z.boolean(),
});
export type Category = z.infer<typeof categoryDocSchema> & { id: string };

export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(40),
    icon: z.enum(CATEGORY_ICONS),
  })
  .strict();
