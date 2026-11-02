import { afterEach, expect, it, vi } from 'vitest';
import { registerApiAuth, getApiAuthRegistration, type ApiAuthAdapter } from './api-auth';
import { createApiClient } from './api-fetch';
import { deferred, errorBody } from '../../test/fixtures/api-fixtures';
const cleanups: (() => void)[] = [];
function install(adapter: ApiAuthAdapter) { const cleanup = registerApiAuth(adapter); cleanups.push(cleanup); return cleanup; }
afterEach(() => { cleanups.reverse().forEach(cleanup => cleanup()); cleanups.length = 0; });

it('registration is inert, cleanup is idempotent and cannot remove its replacement', () => {
  const old = { getToken: vi.fn(() => 'fixture-old') };
  const newer = { getToken: vi.fn(() => 'fixture-new') };
  const cleanup = install(old);
  install(newer);
  cleanup(); cleanup();
  expect(getApiAuthRegistration()?.adapter).toBe(newer);
  expect(old.getToken).not.toHaveBeenCalled();
  expect(newer.getToken).not.toHaveBeenCalled();
});
it.each(['/auth/login', '/auth/register', '/health', '/auth/%6cogin'])('excludes public route %s, including caller-supplied Authorization', async path => {
  const getToken = vi.fn(() => 'fixture-only');
  const onUnauthorized = vi.fn();
  install({ getToken, onUnauthorized });
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(errorBody(401), { status: 401 }));
  await expect(createApiClient({ fetch: fetcher })(path, { headers: { Authorization: 'caller-only' } })).rejects.toMatchObject({ status: 401 });
  expect(new Headers(fetcher.mock.calls[0]![1]?.headers).has('authorization')).toBe(false);
  expect(getToken).not.toHaveBeenCalled();
  expect(onUnauthorized).not.toHaveBeenCalled();
});
it('reads optional token per call and owns Bearer construction on auth/me', async () => {
  let token: string | null = null;
  install({ getToken: () => token });
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({}));
  const request = createApiClient({ fetch: fetcher });
  await request('/auth/me');
  token = 'fixture-token';
  await request('/auth/me', { headers: { authorization: 'caller-only' } });
  expect(new Headers(fetcher.mock.calls[0]![1]?.headers).has('authorization')).toBe(false);
  expect(new Headers(fetcher.mock.calls[1]![1]?.headers).get('authorization')).toBe('Bearer fixture-token');
});
it.each([400, 403, 404, 409, 500])('does not notify unauthorized callback for %s', async status => {
  const onUnauthorized = vi.fn();
  install({ getToken: () => 'fixture', onUnauthorized });
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(errorBody(status), { status })) })('/credentials')).rejects.toMatchObject({ status });
  expect(onUnauthorized).not.toHaveBeenCalled();
});
it('notifies once for a current protected 401 without transport session effects', async () => {
  const onUnauthorized = vi.fn();
  install({ getToken: () => 'fixture', onUnauthorized });
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(errorBody(401), { status: 401 })) })('/credentials')).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).toHaveBeenCalledOnce();
  expect(getApiAuthRegistration()).toBeDefined();
});
it.each(['replacement', 'same-token-new-registration', 'changed-token', 'cleanup'])('ignores late 401 after %s', async scenario => {
  let token = 'fixture-old';
  const oldCallback = vi.fn();
  const newCallback = vi.fn();
  const oldAdapter = { getToken: () => token, onUnauthorized: oldCallback };
  const cleanup = install(oldAdapter);
  const response = deferred<Response>();
  const pending = createApiClient({ fetch: vi.fn<typeof fetch>().mockReturnValue(response.promise) })('/credentials');
  if (scenario === 'replacement') install({ getToken: () => 'fixture-new', onUnauthorized: newCallback });
  if (scenario === 'same-token-new-registration') install(oldAdapter);
  if (scenario === 'changed-token') token = 'fixture-new';
  if (scenario === 'cleanup') cleanup();
  response.resolve(Response.json(errorBody(401), { status: 401 }));
  await expect(pending).rejects.toMatchObject({ status: 401 });
  expect(oldCallback).not.toHaveBeenCalled();
  expect(newCallback).not.toHaveBeenCalled();
});
it('suppresses notification for an aborted 401 body read', async () => {
  const onUnauthorized = vi.fn();
  install({ getToken: () => 'fixture', onUnauthorized });
  const read = deferred<string>();
  const response = new Response('', { status: 401 });
  vi.spyOn(response, 'text').mockReturnValue(read.promise);
  const controller = new AbortController();
  const pending = createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })('/credentials', { signal: controller.signal });
  await Promise.resolve();
  controller.abort(); read.reject(controller.signal.reason);
  await expect(pending).rejects.toBe(controller.signal.reason);
  expect(onUnauthorized).not.toHaveBeenCalled();
});
it('does not let a faulty notification replace the original HTTP error', async () => {
  install({ getToken: () => 'fixture', onUnauthorized: () => { throw new Error('notification failed'); } });
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(errorBody(401), { status: 401 })) })('/credentials')).rejects.toMatchObject({ kind: 'http', status: 401 });
});
it('rejects target overrides before reading credentials', async () => {
  const getToken = vi.fn(() => 'fixture');
  install({ getToken });
  const fetcher = vi.fn<typeof fetch>();
  await expect(createApiClient({ fetch: fetcher })('//other.invalid')).rejects.toBeInstanceOf(TypeError);
  expect(getToken).not.toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
