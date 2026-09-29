import { z } from 'zod';

/** POST /api/auth/session */
export const createSessionSchema = z
  .object({ idToken: z.string().min(20).max(8192), remember: z.boolean().default(true) })
  .strict();

export const emailSchema = z.email('Enter a valid email').max(254);
export const passwordSchema = z.string().min(8, 'Use at least 8 characters').max(128);

export const loginFormSchema = z
  .object({ email: emailSchema, password: z.string().min(1, 'Enter your password'), remember: z.boolean() })
  .strict();

export const registerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(40),
    lastName: z.string().trim().min(1, 'Enter your last name').max(40),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordSchema })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'Choose a new password',
  });
