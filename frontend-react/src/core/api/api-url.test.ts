import { expect, it } from 'vitest';
import { buildApiUrl } from './api-url';

it.each([['/api', 'credentials'], ['/api/', '/credentials'], ['/api///', '/credentials']])('joins %s and %s without dropping the API prefix', (base, path) => {
  expect(new URL(buildApiUrl(base, path)).pathname).toBe('/api/credentials');
});
it('encodes scalar query values and preserves zero, false and search whitespace', () => {
  const url = new URL(buildApiUrl('/api', '/credentials', { search: ' café & +/? ', zero: 0, no: false, empty: '', missing: undefined, nil: null }));
  expect([...url.searchParams.entries()]).toEqual([['search', ' café & +/? '], ['zero', '0'], ['no', 'false']]);
  expect(url.hash).toBe('');
});
it.each(['https://other.invalid/credentials', '//other.invalid', '../outside', '/%2e%2e/outside', '/item/%2e%2e/outside', '/item/%2E%2E%2foutside', '\\outside', '/credentials?token=x', '/credentials#fragment', '/%'])('rejects unsafe path %s', path => {
  expect(() => buildApiUrl('/api', path)).toThrow(TypeError);
});
it.each(['//other.invalid/api', 'javascript:bad', 'https://user:password@fixture.invalid/api', '/api?x=1', '/api#hash', '/api\\bad', 'relative/api'])('rejects unsafe base %s', base => {
  expect(() => buildApiUrl(base, '/credentials')).toThrow(TypeError);
});
it('permits an explicitly configured API origin/base without permitting per-call origin overrides', () => {
  const url = new URL(buildApiUrl('https://api.fixture.invalid/gateway/api/', '/credentials'));
  expect(url.origin).toBe('https://api.fixture.invalid');
  expect(url.pathname).toBe('/gateway/api/credentials');
});
