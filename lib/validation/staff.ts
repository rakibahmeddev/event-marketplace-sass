import { z } from 'zod';

// Client-side mirror of functions/src/scanners/schema.ts (the function validates again).
export const addStaffFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(80),
  email: z.email('Enter a valid email').max(254),
  eventIds: z.array(z.string()).min(1, 'Choose at least one event').max(50),
});
