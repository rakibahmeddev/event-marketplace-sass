import { z } from 'zod';

const eventIds = z
  .array(z.string().regex(/^[A-Za-z0-9]{1,40}$/))
  .min(1, 'Choose at least one event')
  .max(50);

export const createScannerInput = z
  .object({
    name: z.string().trim().min(2, 'Enter a name').max(80),
    email: z
      .email('Enter a valid email')
      .max(254)
      .transform((e) => e.toLowerCase()),
    eventIds,
  })
  .strict();

export const updateScannerInput = z
  .object({
    uid: z.string().min(1).max(128),
    eventIds: eventIds.optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.eventIds !== undefined || v.active !== undefined, 'Nothing to update');
