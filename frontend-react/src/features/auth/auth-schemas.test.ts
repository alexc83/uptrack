import { describe, expect, it } from 'vitest';
import { emailMessage, loginSchema, passwordMinMessage, registerSchema, requiredMessage } from './auth-schemas';

const ok = { name: 'Ada', email: 'ada@example.test', password: '12345678' };
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues.map(i => i.message) ?? [];

describe('registerSchema (mirrors AuthRegisterRequestDto)', () => {
  it('accepts valid input and trims name/email', () => {
    expect(registerSchema.parse({ name: '  Ada ', email: ' ada@example.test ', password: '12345678' })).toEqual(ok);
  });
  it.each([[120, true], [121, false]])('name length %i -> %s', (n, valid) => expect(registerSchema.safeParse({ ...ok, name: 'n'.repeat(n) }).success).toBe(valid));
  it.each([[180, true], [181, false]])('email length %i -> %s', (n, valid) => expect(registerSchema.safeParse({ ...ok, email: `${'e'.repeat(n - 9)}@test.com` }).success).toBe(valid));
  it.each([[7, false], [8, true], [72, true], [73, false]])('password length %i -> %s', (n, valid) => expect(registerSchema.safeParse({ ...ok, password: 'p'.repeat(n) }).success).toBe(valid));
  it.each([['é'.repeat(36), true], ['é'.repeat(37), false], ['🔐'.repeat(18), true], ['🔐'.repeat(19), false]])('validates UTF-8 byte limit for %s', (password, valid) => {
    expect(registerSchema.safeParse({ ...ok, password }).success).toBe(valid);
    expect(loginSchema.safeParse({ email: ok.email, password }).success).toBe(valid);
  });
  it('does not invent password complexity rules', () => expect(registerSchema.safeParse({ ...ok, password: 'aaaaaaaa' }).success).toBe(true));
  it('whitespace-only name is required', () => expect(msg(registerSchema.safeParse({ ...ok, name: '   ' }))).toEqual([requiredMessage]));
  it('short password message', () => expect(msg(registerSchema.safeParse({ ...ok, password: '123' }))).toEqual([passwordMinMessage]));
  it.each(['plain', '@x.com', 'a@', 'a@@b.c', 'a b@c.d'])('rejects email %j', (email) => expect(msg(registerSchema.safeParse({ ...ok, email }))).toEqual([emailMessage]));
  it('is as lenient as the backend for dotless domains', () => expect(registerSchema.safeParse({ ...ok, email: 'a@b' }).success).toBe(true));
});

describe('loginSchema (mirrors AuthLoginRequestDto)', () => {
  it('has no password minimum', () => expect(loginSchema.safeParse({ email: 'a@b.c', password: 'x' }).success).toBe(true));
  it('requires both fields', () => {
    const r = loginSchema.safeParse({ email: '', password: '' });
    expect(msg(r)).toEqual([requiredMessage, requiredMessage]);
  });
  it('caps login email length to match the backend', () => expect(loginSchema.safeParse({ email: `${'e'.repeat(300)}@x.com`, password: 'x' }).success).toBe(false));
});
