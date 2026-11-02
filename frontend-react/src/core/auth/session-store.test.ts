import { MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiAuthRegistration } from '../api/api-auth';
import { ApiError, networkMessage } from '../api/api-error';
import { createApiClient } from '../api/api-fetch';
import { createQueryClient } from '../query/query-client';
import { queryKeys } from '../query/query-keys';
import { authResponseFor, createTestSession, memoryTokenStorage, testToken, type TestSessionOptions } from '../../test/auth-test-utils';
import { deferred, errorBody, user as userA } from '../../test/fixtures/api-fixtures';
import type { UserResponse } from '../../lib/dto/auth';
import { TOKEN_STORAGE_KEY } from './token-storage';

const userB: UserResponse = { ...userA, id: '00000000-0000-4000-8000-0000000000bb', name: 'Second User', email: 'second@example.test' };
const tokenA = testToken('A');
const tokenB = testToken('B');

function setup(options: TestSessionOptions = {}) {
  const client = createQueryClient();
  client.setDefaultOptions({ ...client.getDefaultOptions(), queries: { ...client.getDefaultOptions().queries, retry: false } });
  return { client, ...createTestSession(client, options) };
}
const httpError = (status: number) => new ApiError('http', status, 'x', errorBody(status));
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function signedInAs(token: string, user: UserResponse, options: TestSessionOptions = {}) {
  const s = setup({ token, ...options });
  s.authApi.me.mockResolvedValue(user);
  await s.store.start();
  expect(s.store.getSnapshot().status).toBe('authenticated');
  return s;
}

afterEach(() => vi.unstubAllGlobals());

describe('startup', () => {
  it('starts as a guest without any request when there is no token', async () => {
    const { store, authApi } = setup();
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', user: null, notice: null });
    await store.start();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it.each(['not-a-jwt', 'a.b', '{"token":"x"}', 'x'.repeat(5000)])('treats a malformed stored token (%.12s) as no token, without a request', async (bad) => {
    const storage = memoryTokenStorage(bad);
    const { store, authApi } = setup({ storage });
    expect(store.getSnapshot().status).toBe('unauthenticated');
    expect(store.getToken()).toBeNull();
    await store.start();
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it('verifies a stored token with exactly one /auth/me and then authenticates', async () => {
    const { store, authApi, client } = setup({ token: tokenA });
    const gate = deferred<UserResponse>();
    authApi.me.mockReturnValue(gate.promise);
    expect(store.getSnapshot().status).toBe('initializing');
    const first = store.start();
    const second = store.start();
    expect(authApi.me).toHaveBeenCalledTimes(1);
    gate.resolve(userA);
    await Promise.all([first, second]);
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userA });
    expect(client.getQueryCache().find({ queryKey: queryKeys.authMe() })).toBeUndefined(); // identity is not duplicated into the cache
  });

  it('never exposes the token in the published snapshot', async () => {
    const { store } = await signedInAs(tokenA, userA);
    expect(JSON.stringify(store.getSnapshot())).not.toContain(tokenA);
    expect(Object.keys(store.getSnapshot()).sort()).toEqual(['epoch', 'notice', 'persistenceFailed', 'status', 'user']);
  });

  it('clears the token and records an expired notice when /auth/me answers 401', async () => {
    const storage = memoryTokenStorage(tokenA);
    const { store, authApi } = setup({ storage });
    authApi.me.mockRejectedValue(httpError(401));
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', user: null, notice: 'expired' });
    expect(store.getToken()).toBeNull();
    expect(storage.current()).toBeNull();
  });

  it.each([
    ['403', httpError(403)],
    ['404', httpError(404)],
    ['500', httpError(500)],
    ['503', httpError(503)],
    ['network failure', new ApiError('network', 0, networkMessage)],
    ['malformed response', new ApiError('response', 200)],
    ['unexpected error', new Error('boom')],
  ])('keeps the token and reports "unavailable" for %s', async (_label, error) => {
    const storage = memoryTokenStorage(tokenA);
    const { store, authApi } = setup({ storage });
    authApi.me.mockRejectedValue(error);
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ status: 'unavailable', user: null, notice: null });
    expect(store.getToken()).toBe(tokenA);
    expect(storage.current()).toBe(tokenA);
    expect(storage.removals).toBe(0);
  });

  it('rejects an invalid /auth/me body as unavailable (never authenticates without a user)', async () => {
    const { store, authApi } = setup({ token: tokenA });
    authApi.me.mockResolvedValue(null as never);
    await store.start();
    expect(store.getSnapshot().status).toBe('unavailable');
  });

  it('retries from "unavailable" with a single new request', async () => {
    const { store, authApi } = setup({ token: tokenA });
    authApi.me.mockRejectedValueOnce(new ApiError('network', 0, networkMessage));
    await store.start();
    expect(store.getSnapshot().status).toBe('unavailable');
    authApi.me.mockResolvedValue(userA);
    const a = store.retry();
    const b = store.retry(); // second call while initializing is a no-op
    await Promise.all([a, b]);
    expect(authApi.me).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userA });
  });

  it('"Sign out" from unavailable clears the token and the cache', async () => {
    const storage = memoryTokenStorage(tokenA);
    const { store, authApi, client } = setup({ storage });
    authApi.me.mockRejectedValue(httpError(503));
    await store.start();
    client.setQueryData(queryKeys.dashboard(), { stale: true });
    store.logout();
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'signed-out' });
    expect(storage.current()).toBeNull();
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
  });

  it('never invalidates the session for a late 401 notification while initializing or unavailable', async () => {
    const { store, authApi } = setup({ token: tokenA });
    authApi.me.mockReturnValue(new Promise(() => undefined));
    void store.start();
    store.handleUnauthorized();
    expect(store.getSnapshot().status).toBe('initializing');
    expect(store.getToken()).toBe(tokenA);
  });
});

describe('login and register', () => {
  it('installs the session, persists the token and resets the cache', async () => {
    const storage = memoryTokenStorage();
    const { store, authApi, client } = setup({ storage });
    client.setQueryData(queryKeys.dashboard(), { leftover: true });
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await expect(store.login({ email: 'a@example.test', password: 'secret123' })).resolves.toEqual({ ok: true });
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userA, notice: null });
    expect(store.getToken()).toBe(tokenA);
    expect(storage.current()).toBe(tokenA);
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
  });

  it('registers and signs in with the 201 response', async () => {
    const { store, authApi } = setup();
    authApi.register.mockResolvedValue(authResponseFor(tokenA, userA));
    await expect(store.register({ name: 'N', email: 'a@example.test', password: 'secret123' })).resolves.toEqual({ ok: true });
    expect(authApi.register).toHaveBeenCalledWith({ name: 'N', email: 'a@example.test', password: 'secret123' }, expect.objectContaining({ signal: expect.anything() }));
    expect(store.getSnapshot().status).toBe('authenticated');
  });

  it.each([
    ['invalid credentials', new ApiError('http', 401, 'Invalid email or password.', errorBody(401)), 'Invalid email or password.'],
    ['duplicate email', new ApiError('http', 400, 'Email is already in use.', errorBody(400)), 'Email is already in use.'],
    ['flat validation string', new ApiError('http', 400, 'email: must be a well-formed email address; name: must not be blank', errorBody(400)), 'email: must be a well-formed email address; name: must not be blank'],
    ['network', new ApiError('network', 0, networkMessage), networkMessage],
  ])('returns the message and leaves the session untouched: %s', async (_label, error, message) => {
    const storage = memoryTokenStorage();
    const { store, authApi } = setup({ storage });
    authApi.login.mockRejectedValue(error);
    await expect(store.login({ email: 'a@example.test', password: 'x' })).resolves.toEqual({ ok: false, message });
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', user: null });
    expect(storage.writes).toEqual([]);
    expect(store.getToken()).toBeNull();
  });

  it('a failed login does not end an existing session', async () => {
    const { store, authApi } = await signedInAs(tokenA, userA);
    authApi.login.mockRejectedValue(httpError(401));
    await store.login({ email: 'x@example.test', password: 'x' });
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userA });
    expect(store.getToken()).toBe(tokenA);
  });

  it('rejects an authentication response without a well-formed token or user', async () => {
    const { store, authApi } = setup();
    authApi.login.mockResolvedValue({ token: 'nope', user: userA });
    await expect(store.login({ email: 'a@example.test', password: 'x' })).resolves.toMatchObject({ ok: false });
    authApi.login.mockResolvedValue({ token: tokenA, user: null } as never);
    await expect(store.login({ email: 'a@example.test', password: 'x' })).resolves.toMatchObject({ ok: false });
    expect(store.getSnapshot().status).toBe('unauthenticated');
  });

  it('keeps the session in memory when persistence fails and flags it', async () => {
    const storage = memoryTokenStorage();
    storage.failWrites = true;
    const { store, authApi } = setup({ storage });
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', persistenceFailed: true });
    expect(store.getToken()).toBe(tokenA);
  });

  it('aborts the underlying request when a pending login is cancelled', async () => {
    const { store, authApi } = setup();
    let signal: AbortSignal | undefined;
    authApi.login.mockImplementation((_c, options) => { signal = options?.signal; return new Promise(() => undefined); });
    const pending = store.login({ email: 'a@example.test', password: 'x' });
    store.cancelPendingAuth();
    expect(signal?.aborted).toBe(true);
    await expect(pending).resolves.toEqual({ ok: false, superseded: true });
  });
});

describe('session transitions and races', () => {
  it('logout cancels active queries, removes cached data and clears the token', async () => {
    const storage = memoryTokenStorage();
    const { store, client, authApi } = setup({ storage });
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    let aborted = false;
    const gate = deferred<string>();
    const observer = new QueryObserver(client, { queryKey: queryKeys.dashboard(), queryFn: ({ signal }) => { signal.addEventListener('abort', () => { aborted = true; }); return gate.promise; } });
    const unsubscribe = observer.subscribe(() => undefined);
    await flush();
    client.setQueryData(queryKeys.credentials(), ['credential of A']);
    store.logout();
    expect(aborted).toBe(true);
    expect(store.getToken()).toBeNull();
    expect(storage.current()).toBeNull();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    gate.resolve('late data of A');
    await flush();
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    expect(client.getQueryData(queryKeys.credentials())).toBeUndefined();
    unsubscribe();
  });

  it('logout clears the mutation cache', async () => {
    const { store, client } = await signedInAs(tokenA, userA);
    const mutation = new MutationObserver(client, { mutationFn: () => new Promise(() => undefined) });
    void mutation.mutate().catch(() => undefined);
    expect(client.getMutationCache().getAll()).toHaveLength(1);
    store.logout();
    expect(client.getMutationCache().getAll()).toHaveLength(0);
  });

  it('login immediately after logout starts with an empty cache for the new account', async () => {
    const { store, authApi, client } = await signedInAs(tokenA, userA);
    client.setQueryData(queryKeys.dashboard(), 'A');
    store.logout();
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB });
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    expect(store.getToken()).toBe(tokenB);
  });

  it('account A switching to account B never shows A data, even when the token value repeats', async () => {
    const { store, authApi, client, storage } = await signedInAs(tokenA, userA);
    client.setQueryData(queryKeys.credentials(), ['A-only']);
    client.setQueryData(queryKeys.credential('c1'), 'A-detail');
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(storage.current()).toBe(tokenB);
    client.setQueryData(queryKeys.credentials(), ['B-only']);
    // same-second JWTs can be byte-identical: an explicit login must still reset
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    expect(client.getQueryData(queryKeys.credentials())).toBeUndefined();
  });

  it('two competing logins: the newest wins and the older one is superseded', async () => {
    const { store, authApi } = setup();
    const first = deferred<ReturnType<typeof authResponseFor>>();
    const second = deferred<ReturnType<typeof authResponseFor>>();
    let firstSignal: AbortSignal | undefined;
    authApi.login.mockImplementationOnce((_c, o) => { firstSignal = o?.signal; return first.promise; });
    authApi.login.mockImplementationOnce(() => second.promise);
    const a = store.login({ email: 'a@example.test', password: 'x' });
    const b = store.login({ email: 'b@example.test', password: 'x' });
    expect(firstSignal?.aborted).toBe(true);
    second.resolve(authResponseFor(tokenB, userB));
    await expect(b).resolves.toEqual({ ok: true });
    first.resolve(authResponseFor(tokenA, userA)); // arrives after the newer one finished
    await expect(a).resolves.toEqual({ ok: false, superseded: true });
    expect(store.getToken()).toBe(tokenB);
    expect(store.getSnapshot().user).toEqual(userB);
  });

  it('older login resolving first is still dropped when a newer attempt exists', async () => {
    const { store, authApi } = setup();
    const first = deferred<ReturnType<typeof authResponseFor>>();
    const second = deferred<ReturnType<typeof authResponseFor>>();
    authApi.login.mockImplementationOnce(() => first.promise);
    authApi.login.mockImplementationOnce(() => second.promise);
    const a = store.login({ email: 'a@example.test', password: 'x' });
    const b = store.login({ email: 'b@example.test', password: 'x' });
    first.resolve(authResponseFor(tokenA, userA));
    await expect(a).resolves.toEqual({ ok: false, superseded: true });
    expect(store.getSnapshot().status).toBe('unauthenticated');
    second.resolve(authResponseFor(tokenB, userB));
    await b;
    expect(store.getToken()).toBe(tokenB);
  });

  it('logout beats a pending login', async () => {
    const { store, authApi } = setup();
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    authApi.login.mockReturnValue(gate.promise);
    const pending = store.login({ email: 'a@example.test', password: 'x' });
    store.logout();
    gate.resolve(authResponseFor(tokenA, userA));
    await expect(pending).resolves.toEqual({ ok: false, superseded: true });
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'signed-out' });
    expect(store.getToken()).toBeNull();
  });

  it('an old /auth/me result arriving after a newer session started is discarded', async () => {
    const { store, authApi, storage } = setup({ token: tokenA });
    const oldMe = deferred<UserResponse>();
    authApi.me.mockReturnValue(oldMe.promise);
    const bootstrap = store.start();
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    oldMe.resolve(userA);
    await bootstrap;
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB });
    expect(store.getToken()).toBe(tokenB);
    expect(storage.current()).toBe(tokenB);
  });

  it('an old /auth/me 401 arriving after a newer session started does not sign the new user out', async () => {
    const { store, authApi } = setup({ token: tokenA });
    const oldMe = deferred<UserResponse>();
    authApi.me.mockReturnValue(oldMe.promise);
    const bootstrap = store.start();
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    oldMe.reject(httpError(401));
    await bootstrap;
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB });
    expect(store.getToken()).toBe(tokenB);
  });

  it('a cancelled /auth/me after logout does not publish an "unavailable" state', async () => {
    const { store, authApi } = setup({ token: tokenA });
    authApi.me.mockImplementation((options) => new Promise((_resolve, reject) => options?.signal?.addEventListener('abort', () => reject(options.signal?.reason ?? new Error('aborted')))));
    const bootstrap = store.start();
    store.logout();
    await bootstrap;
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'signed-out' });
  });

  it('cache cleanup of an earlier transition cannot erase data of a later one', async () => {
    const { store, authApi, client } = await signedInAs(tokenA, userA);
    client.getQueryCache().build(client, { queryKey: queryKeys.dashboard(), queryFn: () => new Promise(() => undefined) }).fetch().catch(() => undefined);
    store.logout(); // starts cancellation; its returned promise settles later
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    client.setQueryData(queryKeys.dashboard(), 'B data'); // written before the earlier cancellation promise settled
    await flush();
    await flush();
    expect(client.getQueryData(queryKeys.dashboard())).toBe('B data');
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB });
  });

  it('a mounted observer does not resurrect the previous user data after a session change', async () => {
    const { store, client } = await signedInAs(tokenA, userA);
    const queryFn = vi.fn().mockResolvedValue('A data');
    const observer = new QueryObserver(client, { queryKey: queryKeys.dashboard(), queryFn });
    const unsubscribe = observer.subscribe(() => undefined);
    await flush();
    expect(client.getQueryData(queryKeys.dashboard())).toBe('A data');
    store.logout();
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    unsubscribe();
  });

  it('documents the mutation limit: an unguarded late callback CAN repopulate; a guarded one cannot (contract I6)', async () => {
    const { store, client, authApi } = await signedInAs(tokenA, userA);
    const gate = deferred<string>();
    const guard = store.captureSession();
    const unguarded = new MutationObserver(client, { mutationFn: () => gate.promise, onSuccess: (data) => { client.setQueryData(queryKeys.credentials(), [data]); } });
    const guarded = new MutationObserver(client, { mutationFn: () => gate.promise, onSuccess: (data) => { if (guard.isCurrent()) client.setQueryData(queryKeys.dashboard(), data); } });
    const p1 = unguarded.mutate().catch(() => undefined);
    const p2 = guarded.mutate().catch(() => undefined);
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    expect(guard.isCurrent()).toBe(false);
    gate.resolve('A result');
    await Promise.all([p1, p2]);
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined(); // guarded: safe
    expect(client.getQueryData(queryKeys.credentials())).toEqual(['A result']); // unguarded: proves removeQueries alone is not enough
  });

  it('captureSession is current only for the same authenticated session', async () => {
    const { store, authApi } = await signedInAs(tokenA, userA);
    const guard = store.captureSession();
    expect(guard.isCurrent()).toBe(true);
    store.updateUser({ ...userA, name: 'Renamed' });
    expect(guard.isCurrent()).toBe(true); // same session
    store.handleUnauthorized();
    expect(guard.isCurrent()).toBe(false);
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    expect(guard.isCurrent()).toBe(false); // a new session never revives an old guard
  });

  it('handleUnauthorized expires an authenticated session once; repeats are no-ops', async () => {
    const storage = memoryTokenStorage();
    const { store, client, authApi } = setup({ storage });
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    client.setQueryData(queryKeys.dashboard(), 'A');
    const listener = vi.fn();
    store.subscribe(listener);
    store.handleUnauthorized();
    store.handleUnauthorized();
    store.handleUnauthorized();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'expired', user: null });
    expect(storage.current()).toBeNull();
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
  });

  it('a successful login clears the expired notice', async () => {
    const { store, authApi } = await signedInAs(tokenA, userA);
    store.handleUnauthorized();
    expect(store.getSnapshot().notice).toBe('expired');
    authApi.login.mockResolvedValue(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    expect(store.getSnapshot().notice).toBeNull();
  });

  it('updateUser refreshes identity without resetting the cache', async () => {
    const { store, client } = await signedInAs(tokenA, userA);
    client.setQueryData(queryKeys.dashboard(), 'keep');
    store.updateUser({ ...userA, name: 'Renamed' });
    expect(store.getSnapshot().user?.name).toBe('Renamed');
    expect(client.getQueryData(queryKeys.dashboard())).toBe('keep');
  });

  it('updateUser is ignored for guests and invalid users', () => {
    const { store } = setup();
    store.updateUser(userA);
    expect(store.getSnapshot().user).toBeNull();
  });

  it('notifies subscribers once per transition and supports unsubscribe', async () => {
    const { store, authApi } = setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.logout();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('transport adapter registration', () => {
  it('registers a live token reader, replaces cleanly and unregisters idempotently (StrictMode shape)', async () => {
    const { store } = await signedInAs(tokenA, userA);
    const detach1 = store.attach();
    const first = getApiAuthRegistration();
    expect(first?.adapter.getToken()).toBe(tokenA);
    detach1(); // StrictMode cleanup
    expect(getApiAuthRegistration()).toBeUndefined();
    const detach2 = store.attach(); // StrictMode re-run
    const second = getApiAuthRegistration();
    expect(second).not.toBe(first);
    detach1(); // a stale cleanup must not remove the newer registration
    expect(getApiAuthRegistration()).toBe(second);
    store.logout();
    expect(getApiAuthRegistration()?.adapter.getToken()).toBeNull(); // reads the live token, not a captured copy
    detach2();
    detach2();
    expect(getApiAuthRegistration()).toBeUndefined();
  });

  it('a protected 401 for the current token expires the session through the real transport', async () => {
    const { store, authApi } = setup();
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    const detach = store.attach();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(errorBody(401)), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const api = createApiClient({ baseUrl: '/api', fetch: fetchMock });
    await expect(api('/credentials')).rejects.toMatchObject({ status: 401 });
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe(`Bearer ${tokenA}`);
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'expired' });
    detach();
  });

  it('an old 401 arriving after a new token is installed does not end the new session', async () => {
    const { store, authApi } = setup();
    authApi.login.mockResolvedValueOnce(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    const detach = store.attach();
    const gate = deferred<Response>();
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(gate.promise);
    const api = createApiClient({ baseUrl: '/api', fetch: fetchMock });
    const oldRequest = api('/credentials').catch((error: unknown) => error);
    authApi.login.mockResolvedValueOnce(authResponseFor(tokenB, userB));
    await store.login({ email: 'b@example.test', password: 'x' });
    gate.resolve(new Response(JSON.stringify(errorBody(401)), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    await expect(oldRequest).resolves.toMatchObject({ status: 401 });
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB });
    expect(store.getToken()).toBe(tokenB);
    detach();
  });

  it('403 and ownership 404 responses never end the session', async () => {
    const { store, authApi } = setup();
    authApi.login.mockResolvedValue(authResponseFor(tokenA, userA));
    await store.login({ email: 'a@example.test', password: 'x' });
    const detach = store.attach();
    for (const status of [403, 404, 500]) {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(errorBody(status)), { status, headers: { 'Content-Type': 'application/json' } }));
      await createApiClient({ baseUrl: '/api', fetch: fetchMock })('/credentials').catch(() => undefined);
    }
    expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userA });
    detach();
  });

  it('public login/register requests never carry a bearer, even with a stale token installed', async () => {
    const { store } = await signedInAs(tokenA, userA);
    const detach = store.attach();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(errorBody(401)), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const api = createApiClient({ baseUrl: '/api', fetch: fetchMock });
    await api('/auth/login', { method: 'POST', json: { email: 'a@example.test', password: 'x' } }).catch(() => undefined);
    await api('/auth/register', { method: 'POST', json: { name: 'n', email: 'a@example.test', password: 'password1' } }).catch(() => undefined);
    for (const call of fetchMock.mock.calls) expect(new Headers(call[1]?.headers).has('Authorization')).toBe(false);
    expect(store.getSnapshot().status).toBe('authenticated'); // a public 401 is a form error, not a session event
    detach();
  });
});

describe('cross-tab storage events', () => {
  function target() {
    const listeners = new Set<(event: Event) => void>();
    return {
      listeners,
      api: { addEventListener: (_t: string, l: EventListenerOrEventListenerObject) => listeners.add(l as (event: Event) => void), removeEventListener: (_t: string, l: EventListenerOrEventListenerObject) => listeners.delete(l as (event: Event) => void) } as Pick<Window, 'addEventListener' | 'removeEventListener'>,
      emit: (key: string | null) => listeners.forEach((l) => l({ key } as unknown as StorageEvent)),
    };
  }

  it('another tab logging out ends this session silently and clears the cache', async () => {
    const events = target();
    const storage = memoryTokenStorage(tokenA);
    const { store, client, authApi } = setup({ storage, storageEvents: events.api });
    authApi.me.mockResolvedValue(userA);
    await store.start();
    const detach = store.attach();
    client.setQueryData(queryKeys.dashboard(), 'A');
    storage.remove();
    events.emit(TOKEN_STORAGE_KEY);
    expect(store.getSnapshot()).toMatchObject({ status: 'unauthenticated', notice: 'signed-out' });
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    detach();
    expect(events.listeners.size).toBe(0);
  });

  it('another tab signing in as a different account resets the cache and re-verifies', async () => {
    const events = target();
    const storage = memoryTokenStorage(tokenA);
    const { store, client, authApi } = setup({ storage, storageEvents: events.api });
    authApi.me.mockResolvedValueOnce(userA);
    await store.start();
    const detach = store.attach();
    client.setQueryData(queryKeys.dashboard(), 'A');
    storage.write(tokenB);
    authApi.me.mockResolvedValueOnce(userB);
    events.emit(TOKEN_STORAGE_KEY);
    expect(store.getSnapshot().status).toBe('initializing');
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    await vi.waitFor(() => expect(store.getSnapshot()).toMatchObject({ status: 'authenticated', user: userB }));
    expect(store.getToken()).toBe(tokenB);
    detach();
  });

  it('ignores unrelated keys and unchanged tokens', async () => {
    const events = target();
    const { store, authApi, client } = setup({ token: tokenA, storageEvents: events.api });
    authApi.me.mockResolvedValue(userA);
    await store.start();
    const detach = store.attach();
    client.setQueryData(queryKeys.dashboard(), 'A');
    events.emit('uptrack-theme');
    events.emit(TOKEN_STORAGE_KEY); // storage still holds the same token
    expect(store.getSnapshot().status).toBe('authenticated');
    expect(client.getQueryData(queryKeys.dashboard())).toBe('A');
    detach();
  });

  it('a pending login is abandoned when another tab ends the session', async () => {
    const events = target();
    const storage = memoryTokenStorage(tokenA);
    const { store, authApi } = setup({ storage, storageEvents: events.api });
    authApi.me.mockResolvedValue(userA);
    await store.start();
    const detach = store.attach();
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    authApi.login.mockReturnValue(gate.promise);
    const pending = store.login({ email: 'b@example.test', password: 'x' });
    storage.remove();
    events.emit(null);
    gate.resolve(authResponseFor(tokenB, userB));
    await expect(pending).resolves.toEqual({ ok: false, superseded: true });
    expect(store.getSnapshot().status).toBe('unauthenticated');
    detach();
  });
});

describe('construction', () => {
  it('is inert: no request, no registration', () => {
    const { authApi } = setup({ token: tokenA });
    expect(authApi.me).not.toHaveBeenCalled();
    expect(getApiAuthRegistration()).toBeUndefined();
  });

  it('works with a plain QueryClient too (no app defaults required)', async () => {
    const client = new QueryClient();
    const { store, authApi } = createTestSession(client, { token: tokenA });
    authApi.me.mockResolvedValue(userA);
    await store.start();
    expect(store.getSnapshot().status).toBe('authenticated');
  });
});
