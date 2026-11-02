import { z } from 'zod';

// Limits mirror the backend DTOs (AuthRegisterRequestDto / AuthLoginRequestDto). No extra rules are invented:
// the login password has no minimum, and the email check is as lenient as Jakarta @Email (the server decides).
export const requiredMessage = 'This field is required.';
export const emailMessage = 'Enter a valid email address.';
export const passwordMinMessage = 'Password must be at least 8 characters.';
export const NAME_MAX = 120;
export const EMAIL_MAX = 180;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 255;

// Empty values are reported by the `required` rule alone, so one field never shows two messages.
const looksLikeEmail = (value: string) => {
  if (value === '') return true;
  const at = value.indexOf('@');
  return at > 0 && at === value.lastIndexOf('@') && at < value.length - 1 && !/\s/.test(value);
};

const loginEmail = z.string().trim().min(1, requiredMessage).refine(looksLikeEmail, emailMessage);

export const loginSchema = z.object({
  email: loginEmail,
  password: z.string().min(1, requiredMessage),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, requiredMessage).max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer.`),
  email: z.string().trim().min(1, requiredMessage).max(EMAIL_MAX, `Email must be ${EMAIL_MAX} characters or fewer.`).refine(looksLikeEmail, emailMessage),
  password: z.string().min(1, requiredMessage).min(PASSWORD_MIN, passwordMinMessage).max(PASSWORD_MAX, `Password must be ${PASSWORD_MAX} characters or fewer.`),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginValues = z.output<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;
