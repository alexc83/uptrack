import { afterEach, expect, it, vi } from 'vitest';
import { checkBackendReady } from './health-api';

afterEach(() => vi.unstubAllGlobals());
const stub = (...responses: Array<Response | Error>) => {
  const fetcher = vi.fn<typeof fetch>();
  for (const r of responses) fetcher.mockImplementationOnce(() => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r)));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
};
const urls = (f: ReturnType<typeof stub>) => f.mock.calls.map(([u]) => new URL(String(u)).pathname);

it('is ready only when /api/health/ready answers 200, sending no credentials', async () => {
  const f = stub(Response.json({ status: 'ready' }));
  expect(await checkBackendReady()).toBe(true);
  expect(urls(f)).toEqual(['/api/health/ready']);
  expect(new Headers(f.mock.calls[0]?.[1]?.headers).has('Authorization')).toBe(false);
});
it.each([502, 503, 504])('is not ready on %s or a network failure', async (status) => {
  stub(new Response('<html/>', { status }));
  expect(await checkBackendReady()).toBe(false);
  stub(new TypeError('offline'));
  expect(await checkBackendReady()).toBe(false);
});
it('falls back to liveness only when readiness is not deployed yet (404)', async () => {
  const f = stub(new Response('{}', { status: 404 }), Response.json({ status: 'ok' }));
  expect(await checkBackendReady()).toBe(true);
  expect(urls(f)).toEqual(['/api/health/ready', '/api/health']);
});
