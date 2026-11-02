import { describe, expect, it, vi } from 'vitest';
import { createTokenStorage, isTokenShaped, TOKEN_STORAGE_KEY } from './token-storage';

const good = 'aaa.bbb.ccc';
function fakeStorage(initial?: string) {
  const data = new Map<string, string>(initial === undefined ? [] : [[TOKEN_STORAGE_KEY, initial]]);
  return { data, api: { getItem: vi.fn((k: string) => data.get(k) ?? null), setItem: vi.fn((k: string, v: string) => { data.set(k, v); }), removeItem: vi.fn((k: string) => { data.delete(k); }) } as unknown as Storage };
}

describe('token shape', () => {
  it.each([[good, true], ['a-_.b-_.c-_', true], ['', false], ['a.b', false], ['a.b.c.d', false], ['a b.c.d', false], ['{"token":"x"}', false], ['a.b.c\n', false], ['x'.repeat(4097), false]])('isTokenShaped(%j) = %s', (value, expected) => {
    expect(isTokenShaped(value)).toBe(expected);
  });
  it('rejects non-strings', () => {
    expect(isTokenShaped(null)).toBe(false);
    expect(isTokenShaped(123)).toBe(false);
  });
});

describe('createTokenStorage', () => {
  it('uses the approved key', () => expect(TOKEN_STORAGE_KEY).toBe('uptrack_token'));
  it('reads a well-formed token', () => expect(createTokenStorage(() => fakeStorage(good).api).read()).toBe(good));
  it('returns null when empty', () => expect(createTokenStorage(() => fakeStorage().api).read()).toBeNull());
  it('removes and ignores a malformed stored value', () => {
    const { api, data } = fakeStorage('not-a-jwt');
    expect(createTokenStorage(() => api).read()).toBeNull();
    expect(data.has(TOKEN_STORAGE_KEY)).toBe(false);
  });
  it('writes and removes', () => {
    const { api, data } = fakeStorage();
    const storage = createTokenStorage(() => api);
    expect(storage.write(good)).toBe(true);
    expect(data.get(TOKEN_STORAGE_KEY)).toBe(good);
    storage.remove();
    expect(data.has(TOKEN_STORAGE_KEY)).toBe(false);
  });
  it('never throws when storage is unavailable or throws', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('blocked'); } } as unknown as Storage;
    const storage = createTokenStorage(() => throwing);
    expect(storage.read()).toBeNull();
    expect(storage.write(good)).toBe(false);
    expect(() => storage.remove()).not.toThrow();
    const none = createTokenStorage(() => undefined);
    expect(none.read()).toBeNull();
    expect(none.write(good)).toBe(false);
  });
});
