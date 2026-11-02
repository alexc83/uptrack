// The only persisted session value. Approved contract: localStorage['uptrack_token'] (M02 D7).
// Known limitation (S5): any XSS can read it. Never log, display or put this value in a URL or query key.
export const TOKEN_STORAGE_KEY = 'uptrack_token';
const MAX_TOKEN_LENGTH = 4096;
const TOKEN_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Structural check only; expiry and signature are decided by the server (it cannot tell them apart). */
export function isTokenShaped(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_TOKEN_LENGTH && TOKEN_SHAPE.test(value);
}

export interface TokenStorage {
  /** Returns a well-formed token or null. A malformed stored value is removed. Never throws. */
  read: () => string | null;
  /** Returns false when persistence failed; the caller keeps the token in memory. Never throws. */
  write: (token: string) => boolean;
  remove: () => void;
}

export function createTokenStorage(getStorage: () => Storage | undefined = defaultStorage): TokenStorage {
  return {
    read() {
      try {
        const value = getStorage()?.getItem(TOKEN_STORAGE_KEY);
        if (value === null || value === undefined) return null;
        if (isTokenShaped(value)) return value;
        getStorage()?.removeItem(TOKEN_STORAGE_KEY);
        return null;
      } catch {
        return null;
      }
    },
    write(token) {
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(TOKEN_STORAGE_KEY, token);
        return true;
      } catch {
        return false;
      }
    },
    remove() {
      try {
        getStorage()?.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // Storage may be blocked; the in-memory token is already gone.
      }
    },
  };
}

function defaultStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
