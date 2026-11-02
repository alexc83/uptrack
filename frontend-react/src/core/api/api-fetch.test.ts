import { expect, it, vi } from 'vitest';
import { createApiClient } from './api-fetch';
import { ApiError, fallbackMessage, networkMessage } from './api-error';
import { deferred, errorBody } from '../../test/fixtures/api-fixtures';

it('sends JSON with owned headers and passes the original signal', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ value: 1 }));
  const signal = new AbortController().signal;
  const request = createApiClient({ fetch: fetcher });
  expect(await request('/credentials', { method: 'POST', json: { example: true }, signal, headers: { 'Content-Type': 'wrong', 'X-Example': 'value', Authorization: 'caller-credential' } })).toEqual({ value: 1 });
  const [, init] = fetcher.mock.calls[0]!;
  expect(init).toMatchObject({ method: 'POST', body: '{"example":true}', signal, redirect: 'error', credentials: 'same-origin' });
  const headers = new Headers(init?.headers);
  expect(headers.get('content-type')).toBe('application/json');
  expect(headers.get('accept')).toBe('application/json');
  expect(headers.get('x-example')).toBe('value');
  expect(headers.has('authorization')).toBe(false);
});
it('sends FormData unchanged without a manual content type', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ accepted: true }));
  const formData = new FormData();
  formData.append('file', new File(['fixture'], 'fixture.txt'));
  await createApiClient({ fetch: fetcher })('/uploads/certificates', { method: 'POST', formData, headers: { 'Content-Type': 'multipart/form-data' } });
  const init = fetcher.mock.calls[0]![1];
  expect(init?.body).toBe(formData);
  expect(new Headers(init?.headers).has('content-type')).toBe(false);
});
it('does not add Content-Type to a request without a body', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));
  await createApiClient({ fetch: fetcher })('/credentials');
  expect(new Headers(fetcher.mock.calls[0]![1]?.headers).has('content-type')).toBe(false);
});
it.each([204, 205, 200])('handles expected empty success %s without JSON parsing', async status => {
  const response = new Response(null, { status });
  const read = vi.spyOn(response, 'text');
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })('/void', { method: 'DELETE', response: 'empty' })).resolves.toBeUndefined();
  expect(read).not.toHaveBeenCalled();
});
it.each(['', '  ', '<html>proxy</html>', '{invalid'])('classifies invalid successful JSON %j as response error', async text => {
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(text)) })('/example')).rejects.toMatchObject({ kind: 'response', status: 200 });
});
it('treats unexpected 204 in JSON mode as a response-contract error', async () => {
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })) })('/example')).rejects.toMatchObject({ kind: 'response', status: 204 });
});
it.each([null, [1, 2], { unexpectedShape: true }])('parses JSON without claiming runtime DTO validation', async value => {
  const request = createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(value)) });
  expect(await request<{ id: string }>('/example')).toEqual(value);
});
it.each([400, 401, 403, 404, 409, 429, 500, 502])('preserves HTTP status %s, error details and flat validation copy', async status => {
  const details = { ...errorBody(status), status: 999, message: 'name: must not be blank; hours: must be greater than 0' };
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(Response.json(details, { status })) })('/example')).rejects.toMatchObject({ kind: 'http', status, message: details.message, details });
});
it.each(['plain proxy error', '<html>Error</html>', '{invalid', '', 'null', '{"message":false}', '{"message":"   "}'])('preserves status for nonstandard error body %j', async text => {
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response(text, { status: 502 })) })('/example')).rejects.toMatchObject({ kind: 'http', status: 502, message: fallbackMessage });
});
it('classifies network failures without retaining request material', async () => {
  const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('raw error with private request material'));
  const error = await createApiClient({ fetch: fetcher })('/example').catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ kind: 'network', status: 0, message: networkMessage });
  expect(JSON.stringify(error)).not.toContain('private');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('fails invalid body/config/serialization before Fetch', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const request = createApiClient({ fetch: fetcher });
  await expect(request('/example', { json: {} })).rejects.toBeInstanceOf(TypeError);
  await expect(request('https://other.invalid/example')).rejects.toBeInstanceOf(TypeError);
  await expect(request('/example', { method: 'POST', json: BigInt(1) })).rejects.toBeInstanceOf(TypeError);
  expect(fetcher).not.toHaveBeenCalled();
});
it('preserves pre-abort reason and never invokes Fetch', async () => {
  const controller = new AbortController();
  const reason = new Error('Fixture cancellation');
  controller.abort(reason);
  const fetcher = vi.fn<typeof fetch>();
  await expect(createApiClient({ fetch: fetcher })('/example', { signal: controller.signal })).rejects.toBe(reason);
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([undefined, 'fixture stop', new Error('fixture stop')])('preserves in-flight abort reason %s', async reason => {
  const controller = new AbortController();
  const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => { init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }); }));
  const promise = createApiClient({ fetch: fetcher })('/example', { signal: controller.signal });
  controller.abort(reason);
  await expect(promise).rejects.toBe(controller.signal.reason);
});
it('does not misclassify an AbortError without a supplied signal', async () => {
  const error = new DOMException('Fixture abort', 'AbortError');
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockRejectedValue(error) })('/example')).rejects.toBe(error);
});
it('preserves abort during response body reading', async () => {
  const controller = new AbortController();
  const read = deferred<string>();
  const response = new Response();
  vi.spyOn(response, 'text').mockImplementation(() => read.promise);
  const pending = createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })('/example', { signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  read.reject(controller.signal.reason);
  await expect(pending).rejects.toBe(controller.signal.reason);
});
it('checks abortion after body reading even when an injected reader ignores abort', async () => {
  const controller = new AbortController();
  const read = deferred<string>();
  const response = new Response();
  vi.spyOn(response, 'text').mockReturnValue(read.promise);
  const pending = createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })('/example', { signal: controller.signal });
  await Promise.resolve();
  controller.abort('fixture reason');
  read.resolve('{}');
  await expect(pending).rejects.toBe('fixture reason');
});
it.each([200, 502])('retains known status %s when body reading fails', async status => {
  const response = new Response('', { status });
  vi.spyOn(response, 'text').mockRejectedValue(new TypeError('reader failed'));
  await expect(createApiClient({ fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })('/example')).rejects.toMatchObject({ kind: status === 200 ? 'response' : 'http', status });
});
