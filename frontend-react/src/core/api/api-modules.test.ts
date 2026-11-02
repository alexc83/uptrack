import { expect, it, vi } from 'vitest';
import { authApi } from './auth-api';
import { credentialsApi } from './credentials-api';
import { ceRecordsApi } from './ce-records-api';
import { dashboardApi } from './dashboard-api';
import { uploadsApi } from './uploads-api';
import { usersApi } from './users-api';
import { credential, credentialId, credentialRequest, record, recordId, recordRequest, user } from '../../test/fixtures/api-fixtures';

const authRequest = { email: 'fixture@example.test', password: 'fixture-only-not-a-real-password' };
const profile = { name: 'Fixture User', email: 'fixture@example.test' };
const password = { currentPassword: 'fixture-current', newPassword: 'fixture-replacement' };
const cases = [
  { name: 'login', path: '/auth/login', method: 'POST', body: authRequest, call: (signal: AbortSignal) => authApi.login(authRequest, { signal }) },
  { name: 'register', path: '/auth/register', method: 'POST', body: { ...authRequest, name: 'Fixture User' }, call: (signal: AbortSignal) => authApi.register({ ...authRequest, name: 'Fixture User' }, { signal }) },
  { name: 'auth me', path: '/auth/me', method: 'GET', call: (signal: AbortSignal) => authApi.me({ signal }) },
  { name: 'credential list', path: '/credentials', method: 'GET', call: (signal: AbortSignal) => credentialsApi.list({}, { signal }) },
  { name: 'credential get', path: `/credentials/${credentialId}`, method: 'GET', call: (signal: AbortSignal) => credentialsApi.get(credentialId, { signal }) },
  { name: 'credential create', path: '/credentials', method: 'POST', body: credentialRequest, call: (signal: AbortSignal) => credentialsApi.create(credentialRequest, { signal }) },
  { name: 'credential update', path: `/credentials/${credentialId}`, method: 'PUT', body: credentialRequest, call: (signal: AbortSignal) => credentialsApi.update(credentialId, credentialRequest, { signal }) },
  { name: 'credential delete', path: `/credentials/${credentialId}`, method: 'DELETE', call: (signal: AbortSignal) => credentialsApi.delete(credentialId, { signal }) },
  { name: 'credential CE list', path: `/credentials/${credentialId}/ce-records`, method: 'GET', call: (signal: AbortSignal) => credentialsApi.getCERecords(credentialId, { signal }) },
  { name: 'credential report', path: `/credentials/${credentialId}/ce-report`, method: 'GET', call: (signal: AbortSignal) => credentialsApi.getCEReport(credentialId, { signal }) },
  { name: 'CE get', path: `/ce-records/${recordId}`, method: 'GET', call: (signal: AbortSignal) => ceRecordsApi.get(recordId, { signal }) },
  { name: 'CE create', path: '/ce-records', method: 'POST', body: recordRequest, call: (signal: AbortSignal) => ceRecordsApi.create(recordRequest, { signal }) },
  { name: 'CE update', path: `/ce-records/${recordId}`, method: 'PUT', body: recordRequest, call: (signal: AbortSignal) => ceRecordsApi.update(recordId, recordRequest, { signal }) },
  { name: 'CE delete', path: `/ce-records/${recordId}`, method: 'DELETE', call: (signal: AbortSignal) => ceRecordsApi.delete(recordId, { signal }) },
  { name: 'dashboard', path: '/dashboard', method: 'GET', call: (signal: AbortSignal) => dashboardApi.get({ signal }) },
  { name: 'upload', path: '/uploads/certificates', method: 'POST', call: (signal: AbortSignal) => uploadsApi.uploadCertificate(new File(['fixture'], 'fixture.pdf', { type: 'application/pdf' }), { signal }) },
  { name: 'get profile', path: '/users/me', method: 'GET', call: (signal: AbortSignal) => usersApi.getProfile({ signal }) },
  { name: 'update profile', path: '/users/me', method: 'PUT', body: profile, call: (signal: AbortSignal) => usersApi.updateProfile(profile, { signal }) },
  { name: 'password', path: '/users/me/password', method: 'PUT', body: password, call: (signal: AbortSignal) => usersApi.changePassword(password, { signal }) },
];
it.each(cases)('binds $name to the exact method, endpoint, body and signal', async testCase => {
  const empty = testCase.method === 'DELETE' || testCase.name === 'password';
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(empty ? new Response(null, { status: 204 }) : Response.json({}, { status: testCase.method === 'POST' ? 201 : 200 }));
  vi.stubGlobal('fetch', fetcher);
  const signal = new AbortController().signal;
  const result = await testCase.call(signal);
  const [url, options] = fetcher.mock.calls[0]!;
  expect(new URL(String(url)).pathname).toBe(`/api${testCase.path}`);
  expect(options).toMatchObject({ method: testCase.method, signal });
  if ('body' in testCase) expect(JSON.parse(String(options?.body))).toEqual(testCase.body);
  else if (testCase.name === 'upload') expect((options?.body as FormData).get('file')).toBeInstanceOf(File);
  else expect(options?.body).toBeUndefined();
  if (empty) expect(result).toBeUndefined();
  expect(fetcher).toHaveBeenCalledOnce();
});
it('whitelists credential filters and returns wire data without pagination/ratio coercion', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([credential]));
  vi.stubGlobal('fetch', fetcher);
  const filters = { status: 'ACTIVE' as const, type: 'LICENSE' as const, search: ' café & + ', userId: 'ignored', page: 2, size: 10, sort: 'ignored' };
  const result = await credentialsApi.list(filters);
  const query = new URL(String(fetcher.mock.calls[0]![0])).searchParams;
  expect([...query.entries()]).toEqual([['status', 'ACTIVE'], ['type', 'LICENSE'], ['search', ' café & + ']]);
  expect(result).toEqual([credential]);
  expect(result[0]?.ceProgress).toBe(1.5);
  expect(result[0]?.ceRecords[0]?.certificateUrl).toBeNull();
});
it('encodes path IDs instead of interpreting them as paths or query strings', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(record));
  vi.stubGlobal('fetch', fetcher);
  await ceRecordsApi.get('fixture?value/#');
  expect(new URL(String(fetcher.mock.calls[0]![0])).pathname).toBe('/api/ce-records/fixture%3Fvalue%2F%23');
});
it('has no network side effects on fresh module imports or QueryClient construction', async () => {
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetcher);
  vi.resetModules();
  await Promise.all([import('./auth-api'), import('./credentials-api'), import('./ce-records-api'), import('./dashboard-api'), import('./uploads-api'), import('./users-api')]);
  const { createQueryClient } = await import('../query/query-client');
  const client = createQueryClient();
  expect(fetcher).not.toHaveBeenCalled();
  client.clear();
});
it('preserves an auth response without persisting the returned token', async () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({ token: 'fixture-only', user })));
  expect(await authApi.login(authRequest)).toEqual({ token: 'fixture-only', user });
  expect(setItem).not.toHaveBeenCalled();
});
