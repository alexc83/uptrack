import type { QueryClient } from '@tanstack/react-query';
import { vi } from 'vitest';
import { createSessionStore, type SessionStore } from '../core/auth/session-store';
import { isTokenShaped, type TokenStorage } from '../core/auth/token-storage';
import type { AuthResponse, UserResponse } from '../lib/dto/auth';
import { user as fixtureUser } from './fixtures/api-fixtures';

/** Structurally valid (but meaningless) tokens; the backend alone decides real validity. */
export const testToken = (tag = 'a') => `h${tag}.p${tag}.s${tag}`;

export interface MemoryTokenStorage extends TokenStorage {
  current: () => string | null;
  writes: string[];
  removals: number;
  failWrites: boolean;
}

export function memoryTokenStorage(initial: string | null = null): MemoryTokenStorage {
  let value = initial;
  const storage: MemoryTokenStorage = {
    writes: [],
    removals: 0,
    failWrites: false,
    current: () => value,
    read: () => (isTokenShaped(value) ? value : null),
    write: (token) => {
      if (storage.failWrites) return false;
      storage.writes.push(token);
      value = token;
      return true;
    },
    remove: () => { storage.removals += 1; value = null; },
  };
  return storage;
}

export const authResponseFor = (token: string, user: UserResponse = fixtureUser): AuthResponse => ({ token, user });

export function createFakeAuthApi() {
  return {
    login: vi.fn<(credentials: unknown, options?: { signal?: AbortSignal }) => Promise<AuthResponse>>(),
    register: vi.fn<(request: unknown, options?: { signal?: AbortSignal }) => Promise<AuthResponse>>(),
    me: vi.fn<(options?: { signal?: AbortSignal }) => Promise<UserResponse>>(),
  };
}
export type FakeAuthApi = ReturnType<typeof createFakeAuthApi>;

export interface TestSessionOptions {
  token?: string | null;
  authApi?: FakeAuthApi;
  storage?: MemoryTokenStorage;
  storageEvents?: Pick<Window, 'addEventListener' | 'removeEventListener'> | null;
}

export function createTestSession(client: QueryClient, options: TestSessionOptions = {}): { store: SessionStore; authApi: FakeAuthApi; storage: MemoryTokenStorage } {
  const storage = options.storage ?? memoryTokenStorage(options.token ?? null);
  const authApi = options.authApi ?? createFakeAuthApi();
  const store = createSessionStore({ queryClient: client, authApi: authApi as never, storage, storageEvents: options.storageEvents ?? null });
  return { store, authApi, storage };
}
