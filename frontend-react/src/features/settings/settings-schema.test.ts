import { describe, expect, it } from 'vitest';
import { passwordSchema, profileSchema } from './settings-schema';

describe('profileSchema', () => {
  it('accepts valid name and email', () => {
    const parsed = profileSchema.parse({ name: 'Alex Nurse', email: 'alex@example.com' });
    expect(parsed).toEqual({ name: 'Alex Nurse', email: 'alex@example.com' });
  });

  it('trims whitespace', () => {
    const parsed = profileSchema.parse({ name: '  Alex Nurse  ', email: '  alex@example.com  ' });
    expect(parsed).toEqual({ name: 'Alex Nurse', email: 'alex@example.com' });
  });

  it('validates required fields and email format', () => {
    const emptyResult = profileSchema.safeParse({ name: '', email: '' });
    expect(emptyResult.success).toBe(false);
    if (!emptyResult.success) {
      const messages = emptyResult.error.flatten().fieldErrors;
      expect(messages.name).toContain('Name is required.');
      expect(messages.email).toContain('Email is required.');
    }

    const invalidEmailResult = profileSchema.safeParse({ name: 'Alex', email: 'not-an-email' });
    expect(invalidEmailResult.success).toBe(false);
    if (!invalidEmailResult.success) {
      expect(invalidEmailResult.error.flatten().fieldErrors.email).toContain('Enter a valid email address.');
    }
  });
});

describe('passwordSchema', () => {
  it('accepts valid differing passwords with matching confirmation', () => {
    const parsed = passwordSchema.parse({
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
      confirmPassword: 'newPassword456',
    });
    expect(parsed).toEqual({
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
      confirmPassword: 'newPassword456',
    });
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = passwordSchema.safeParse({
      currentPassword: 'oldPassword123',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.newPassword).toContain('Password must be at least 8 characters.');
    }
  });

  it('rejects new password if identical to current password', () => {
    const result = passwordSchema.safeParse({
      currentPassword: 'samePassword123',
      newPassword: 'samePassword123',
      confirmPassword: 'samePassword123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.newPassword).toContain(
        'New password must be different from your current password.',
      );
    }
  });

  it('rejects confirm password when it does not match new password', () => {
    const result = passwordSchema.safeParse({
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword456',
      confirmPassword: 'differentPassword789',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Confirm password must match the new password.',
      );
    }
  });
});
