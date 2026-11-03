import { z } from 'zod';
import { fitsPasswordByteLimit, passwordByteLimitMessage } from '../../lib/password';

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120, 'Name must be 120 characters or fewer.'),
  email: z.string().trim().min(1, 'Email is required.').email('Enter a valid email address.').max(180, 'Email must be 180 characters or fewer.'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').refine(fitsPasswordByteLimit, passwordByteLimitMessage),
    newPassword: z
      .string()
      .min(1, 'New password is required.')
      .min(8, 'Password must be at least 8 characters.')
      .refine(fitsPasswordByteLimit, passwordByteLimitMessage),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((data) => !data.currentPassword || !data.newPassword || data.newPassword !== data.currentPassword, {
    message: 'New password must be different from your current password.',
    path: ['newPassword'],
  })
  .refine((data) => !data.newPassword || !data.confirmPassword || data.confirmPassword === data.newPassword, {
    message: 'Confirm password must match the new password.',
    path: ['confirmPassword'],
  });

export type PasswordFormValues = z.infer<typeof passwordSchema>;
