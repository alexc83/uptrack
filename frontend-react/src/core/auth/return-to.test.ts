import { describe, expect, it } from 'vitest';
import { buildAuthRedirect, parseReturnTo, resolveReturnTo } from './return-to';

describe('parseReturnTo', () => {
  it.each([
    '/dashboard', '/credentials', '/ce-records', '/settings',
    '/credentials?credentialId=abc', '/credentials?status=ACTIVE&search=a%20b#top',
    '/credentials/11111111-1111-4111-8111-111111111111/ce-report',
    '/credentials/abc/ce-report?returnTo=%2Fcredentials',
  ])('accepts %s unchanged', (value) => expect(parseReturnTo(value)).toBe(value));

  it.each([
    ['null', null], ['undefined', undefined], ['empty', ''],
    ['absolute URL', 'https://evil.example/dashboard'], ['protocol-relative', '//evil.example'], ['triple slash', '///evil.example'],
    ['backslash', '/\\evil.example'], ['backslash path', '/dashboard\\..\\x'], ['javascript scheme', 'javascript:alert(1)'], ['data scheme', 'data:text/html,x'],
    ['encoded slashes', '/%2F%2Fevil.example'], ['encoded backslash', '/%5Cevil.example'], ['encoded CRLF', '/dashboard%0d%0aSet-Cookie:x'],
    ['raw newline', '/dashboard\nx'], ['tab', '/dash\tboard'], ['space', '/dash board'], ['NUL', '/dashboard\u0000'],
    ['relative', 'dashboard'], ['root', '/'], ['auth params', '/?auth=login'], ['unknown route', '/admin'], ['near miss', '/dashboard-evil'],
    ['nested unknown', '/credentials/abc/other'], ['malformed escape', '/dashboard%E0%A4%A'], ['oversize', `/credentials?x=${'a'.repeat(2100)}`],
  ])('rejects %s', (_label, value) => expect(parseReturnTo(value as string | null | undefined)).toBeNull());

  it('resolves rejected values to the dashboard', () => {
    expect(resolveReturnTo('//evil.example')).toBe('/dashboard');
    expect(resolveReturnTo(null)).toBe('/dashboard');
    expect(resolveReturnTo('/settings')).toBe('/settings');
  });
});

describe('buildAuthRedirect', () => {
  it('keeps path, query and hash and encodes them as one parameter', () => {
    const url = buildAuthRedirect({ pathname: '/credentials', search: '?credentialId=a&x=1', hash: '#h' });
    const params = new URL(url, 'http://x.invalid').searchParams;
    expect(url.startsWith('/?')).toBe(true);
    expect(params.get('auth')).toBe('login');
    expect(params.get('returnTo')).toBe('/credentials?credentialId=a&x=1#h');
  });
  it('omits returnTo for destinations that are not restorable', () => {
    const params = new URL(buildAuthRedirect({ pathname: '/not-a-route', search: '', hash: '' }), 'http://x.invalid').searchParams;
    expect(params.has('returnTo')).toBe(false);
  });
});
