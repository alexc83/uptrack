import type { QueryClient } from '@tanstack/react-query';
import { registerApiAuth } from '../api/api-auth';
import { ApiError, fallbackMessage, isAbortError } from '../api/api-error';
import { authApi as defaultAuthApi } from '../api/auth-api';
import { queryKeys } from '../query/query-keys';
import type { AuthLoginRequest, AuthRegisterRequest, AuthResponse, UserResponse } from '../../lib/dto/auth';
import { createTokenStorage, isTokenShaped, TOKEN_STORAGE_KEY, type TokenStorage } from './token-storage';

/**
 * Session store — the single owner of the bearer token and the signed-in user.
 *
 * Server state (credentials, CE records, ...) stays in TanStack Query; this store only holds identity.
 * The token is never part of the published snapshot, the React context, an error, a log line or a query key.
 *
 * Transition invariants (verified by session-store.test.ts and documented in verification/m06-report.md):
 *  I1. Every change of session state goes through `#commit`, which is fully synchronous. Token swap, storage
 *      write, query cancellation, query removal, mutation-cache clearing and snapshot publication happen in one
 *      uninterrupted turn, so no other transition can interleave with them and a stale cleanup can never run
 *      after a newer transition started.
 *  I2. Asynchronous work (`/auth/me`, login, register) only produces a *candidate*. Before committing, the
 *      continuation re-checks a generation captured at start (`epoch` for bootstrap, `attempt` for explicit
 *      login/register) and silently drops itself if it is no longer current. There is no await between that
 *      check and the commit.
 *  I3. `epoch` increases on every commit. A bootstrap result is valid only if no commit happened since it began.
 *  I4. `attempt` increases on every login/register/logout/external-logout. Only the latest attempt may install a
 *      session, so competing logins resolve to the newest one and logout always beats a pending login.
 *  I5. Query keys carry no user id, so the cache is reset whenever the session identity is replaced or removed
 *      (and on every explicit login/register, even if the server returned an identical token).
 *  I6. Mutations cannot be cancelled by TanStack Query; their callbacks may still write to the cache after a
 *      session change. Feature code must guard such writes with `captureSession().isCurrent()`.
 */

export type SessionStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'unavailable';
/** Why the session ended: 'expired' (involuntary, shown to the user) or 'signed-out' (explicit; routes to plain `/`). */
export type SessionNotice = 'expired' | 'signed-out' | null;

export interface SessionSnapshot {
  readonly status: SessionStatus;
  /** Non-null if and only if status is 'authenticated'. */
  readonly user: UserResponse | null;
  /** Transient reason for the guest state; cleared by the next transition. */
  readonly notice: SessionNotice;
  /** True when the token could not be written to localStorage; the session then lasts until the tab closes. */
  readonly persistenceFailed: boolean;
  /** Generation counter; increases on every committed transition. Carries no secret. */
  readonly epoch: number;
}

export type AuthOutcome = { ok: true } | { ok: false; superseded: true } | { ok: false; superseded?: false; message: string };

export interface SessionGuard {
  /** True while the session that existed when the guard was captured is still the active, authenticated one. */
  isCurrent: () => boolean;
}

type AuthApi = Pick<typeof defaultAuthApi, 'login' | 'register' | 'me'>;
type StorageEventTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export interface SessionStoreOptions {
  queryClient: QueryClient;
  authApi?: AuthApi;
  storage?: TokenStorage;
  /** Cross-tab synchronisation source; pass null to disable. Defaults to `window`. */
  storageEvents?: StorageEventTarget | null;
}

interface Commit {
  token: string | null;
  status: SessionStatus;
  user: UserResponse | null;
  notice?: SessionNotice;
  /** Skip the storage write when the change originated from storage itself. */
  persist?: boolean;
  /** Reset the cache even when the token value is unchanged. */
  forceReset?: boolean;
}

function isUser(value: unknown): value is UserResponse {
  return typeof value === 'object' && value !== null
    && typeof (value as UserResponse).id === 'string'
    && typeof (value as UserResponse).name === 'string'
    && typeof (value as UserResponse).email === 'string';
}

function abortion(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = () => reject(new DOMException('Superseded', 'AbortError'));
    if (signal.aborted) fail();
    else signal.addEventListener('abort', fail, { once: true });
  });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'http' && error.status === 401;
}

export class SessionStore {
  readonly #queryClient: QueryClient;
  readonly #authApi: AuthApi;
  readonly #storage: TokenStorage;
  readonly #storageEvents: StorageEventTarget | null;
  readonly #listeners = new Set<() => void>();
  #token: string | null;
  #snapshot: SessionSnapshot;
  #attempt = 0;
  #attemptController: AbortController | null = null;
  #bootstrap: { epoch: number; promise: Promise<void> } | null = null;

  constructor({ queryClient, authApi = defaultAuthApi, storage = createTokenStorage(), storageEvents }: SessionStoreOptions) {
    this.#queryClient = queryClient;
    this.#authApi = authApi;
    this.#storage = storage;
    this.#storageEvents = storageEvents === undefined ? (typeof window === 'undefined' ? null : window) : storageEvents;
    this.#token = storage.read();
    this.#snapshot = { status: this.#token ? 'initializing' : 'unauthenticated', user: null, notice: null, persistenceFailed: false, epoch: 0 };
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  };

  getSnapshot = (): SessionSnapshot => this.#snapshot;

  /** Read synchronously by the API transport on every request. */
  getToken = (): string | null => this.#token;

  captureSession(): SessionGuard {
    const { epoch } = this.#snapshot;
    return { isCurrent: () => this.#snapshot.epoch === epoch && this.#snapshot.status === 'authenticated' };
  }

  /** Registers the transport adapter and cross-tab listener. Idempotent cleanup; safe under StrictMode remounts. */
  attach(): () => void {
    const unregister = registerApiAuth({ getToken: this.getToken, onUnauthorized: () => this.handleUnauthorized() });
    const target = this.#storageEvents;
    const listener = (event: Event) => this.#onStorage(event as StorageEvent);
    target?.addEventListener('storage', listener);
    return () => {
      unregister();
      target?.removeEventListener('storage', listener);
    };
  }

  /** Starts (or joins) the single `/auth/me` bootstrap for a stored token. No-op without a token. */
  start(): Promise<void> {
    return this.#snapshot.status === 'initializing' ? this.#startBootstrap() : Promise.resolve();
  }

  login(credentials: AuthLoginRequest): Promise<AuthOutcome> {
    return this.#authenticate((signal) => this.#authApi.login(credentials, { signal }));
  }

  register(request: AuthRegisterRequest): Promise<AuthOutcome> {
    return this.#authenticate((signal) => this.#authApi.register(request, { signal }));
  }

  /** Abandons any pending login/register (e.g. the dialog closed). Never changes an established session. */
  cancelPendingAuth(): void {
    this.#cancelAttempts();
  }

  logout(): void {
    this.#cancelAttempts();
    this.#commit({ token: null, status: 'unauthenticated', user: null, notice: 'signed-out', forceReset: true });
  }

  /** Called by the transport for a protected 401 under the current token. Idempotent; ignores everything else. */
  handleUnauthorized(): void {
    if (this.#snapshot.status !== 'authenticated') return;
    this.#commit({ token: null, status: 'unauthenticated', user: null, notice: 'expired', forceReset: true });
  }

  retry(): Promise<void> {
    if (this.#snapshot.status !== 'unavailable') return Promise.resolve();
    this.#commit({ token: this.#token, status: 'initializing', user: null });
    return this.#startBootstrap();
  }

  /** Identity refresh after a profile save (M12). Same session: no epoch change, no cache reset. */
  updateUser(user: UserResponse): void {
    if (this.#snapshot.status !== 'authenticated' || !isUser(user)) return;
    this.#snapshot = { ...this.#snapshot, user };
    this.#notify();
  }

  // ---- internals -----------------------------------------------------------------------------------------

  #startBootstrap(): Promise<void> {
    const { epoch } = this.#snapshot;
    if (this.#bootstrap?.epoch === epoch) return this.#bootstrap.promise;
    const promise = this.#runBootstrap(epoch);
    this.#bootstrap = { epoch, promise };
    void promise.finally(() => { if (this.#bootstrap?.promise === promise) this.#bootstrap = null; });
    return promise;
  }

  async #runBootstrap(epoch: number): Promise<void> {
    const token = this.#token;
    try {
      const user = await this.#queryClient.fetchQuery({
        queryKey: queryKeys.authMe(),
        queryFn: ({ signal }) => this.#authApi.me({ signal }),
        staleTime: 0,
        gcTime: 0,
      });
      if (this.#snapshot.epoch !== epoch) return; // I2/I3
      if (!isUser(user)) {
        this.#commit({ token, status: 'unavailable', user: null });
        return;
      }
      this.#commit({ token, status: 'authenticated', user });
      this.#queryClient.removeQueries({ queryKey: queryKeys.authMe(), exact: true }); // identity lives here, not in the cache
    } catch (error) {
      if (this.#snapshot.epoch !== epoch) return; // late or cancelled response from a previous session
      if (isUnauthorized(error)) this.#commit({ token: null, status: 'unauthenticated', user: null, notice: 'expired', forceReset: true });
      else this.#commit({ token, status: 'unavailable', user: null }); // network, 5xx, 403, cancelled-without-transition: keep the token
    }
  }

  async #authenticate(request: (signal: AbortSignal) => Promise<AuthResponse>): Promise<AuthOutcome> {
    const attempt = this.#beginAttempt();
    const controller = this.#attemptController as AbortController;
    try {
      // Race against the abort signal so a superseded attempt settles promptly even if the transport ignores it.
      const response = await Promise.race([request(controller.signal), abortion(controller.signal)]);
      if (attempt !== this.#attempt) return { ok: false, superseded: true }; // I4
      if (!isTokenShaped(response?.token) || !isUser(response.user)) return { ok: false, message: fallbackMessage };
      this.#commit({ token: response.token, status: 'authenticated', user: response.user, forceReset: true });
      return { ok: true };
    } catch (error) {
      if (attempt !== this.#attempt || isAbortError(error)) return { ok: false, superseded: true };
      return { ok: false, message: error instanceof ApiError ? error.message : fallbackMessage };
    } finally {
      if (this.#attemptController === controller) this.#attemptController = null;
    }
  }

  #beginAttempt(): number {
    this.#cancelAttempts();
    this.#attemptController = new AbortController();
    return this.#attempt;
  }

  #cancelAttempts(): void {
    this.#attempt += 1;
    this.#attemptController?.abort();
    this.#attemptController = null;
  }

  #onStorage(event: StorageEvent): void {
    if (event.key !== null && event.key !== TOKEN_STORAGE_KEY) return;
    const stored = this.#storage.read();
    if (stored === this.#token) return;
    this.#cancelAttempts();
    if (stored === null) {
      this.#commit({ token: null, status: 'unauthenticated', user: null, notice: 'signed-out', persist: false, forceReset: true });
      return;
    }
    // Another tab signed in (possibly as a different account): drop everything and re-verify.
    this.#commit({ token: stored, status: 'initializing', user: null, persist: false, forceReset: true });
    void this.#startBootstrap();
  }

  /** The only place session state changes. Synchronous by design (invariant I1). */
  #commit({ token, status, user, notice = null, persist = true, forceReset = false }: Commit): void {
    const identityChanged = token !== this.#token;
    let persistenceFailed = this.#snapshot.persistenceFailed;
    if (identityChanged) {
      this.#token = token;
      if (persist) {
        if (token === null) { this.#storage.remove(); persistenceFailed = false; }
        else persistenceFailed = !this.#storage.write(token);
      }
    }
    if (identityChanged || forceReset) this.#resetServerState();
    this.#snapshot = { status, user, notice, persistenceFailed, epoch: this.#snapshot.epoch + 1 };
    this.#notify();
  }

  #resetServerState(): void {
    // Order matters: cancel first so in-flight fetches abort, then drop the entries and mutations.
    // cancelQueries() starts cancelling synchronously; its returned promise only reports completion.
    this.#queryClient.cancelQueries().catch(() => undefined);
    this.#queryClient.removeQueries();
    this.#queryClient.getMutationCache().clear();
  }

  #notify(): void {
    for (const listener of [...this.#listeners]) listener();
  }
}

export function createSessionStore(options: SessionStoreOptions): SessionStore {
  return new SessionStore(options);
}
