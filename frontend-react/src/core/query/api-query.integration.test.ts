import { QueryObserver, CancelledError } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { createApiClient } from '../api/api-fetch';
import { createQueryClient } from './query-client';
import { queryKeys } from './query-keys';
import { deferred } from '../../test/fixtures/api-fixtures';

it.each([500, 502])('limits HTTP %s, even with non-JSON error bodies, to three total attempts', async status => {
  const client = createQueryClient();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response('<html>fixture</html>', { status }));
  const api = createApiClient({ fetch: fetcher });
  await expect(client.fetchQuery({ queryKey: ['fixture'], queryFn: ({ signal }) => api('/fixture', { signal }), retryDelay: 0 })).rejects.toMatchObject({ kind: 'http', status });
  expect(fetcher).toHaveBeenCalledTimes(3);
  client.clear();
});
it.each([400, 401, 403, 404, 409, 429])('does not retry HTTP %s', async status => {
  const client = createQueryClient();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ message: 'fixture' }, { status }));
  const api = createApiClient({ fetch: fetcher });
  await expect(client.fetchQuery({ queryKey: ['fixture'], queryFn: ({ signal }) => api('/fixture', { signal }), retryDelay: 0 })).rejects.toMatchObject({ status });
  expect(fetcher).toHaveBeenCalledOnce(); client.clear();
});
it.each(['network', 'empty', 'malformed', 'unexpected-204', 'abort'])('does not retry %s failures', async scenario => {
  const client = createQueryClient();
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
    if (scenario === 'network') throw new TypeError('fixture');
    if (scenario === 'abort') throw new DOMException('fixture', 'AbortError');
    if (scenario === 'unexpected-204') return new Response(null, { status: 204 });
    return new Response(scenario === 'empty' ? '' : '{bad');
  });
  const api = createApiClient({ fetch: fetcher });
  await expect(client.fetchQuery({ queryKey: ['fixture'], queryFn: ({ signal }) => api('/fixture', { signal }), retryDelay: 0 })).rejects.toBeDefined();
  expect(fetcher).toHaveBeenCalledOnce(); client.clear();
});
it.each([false, true])('query-owned cancellation aborts Fetch and restores previous state (cached=%s)', async cached => {
  const client = createQueryClient();
  const key = queryKeys.credential('fixture');
  if (cached) client.setQueryData(key, { previous: true });
  const started = deferred<AbortSignal>();
  const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    const signal = init!.signal!;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    started.resolve(signal);
  }));
  const api = createApiClient({ fetch: fetcher });
  const result = client.fetchQuery({ queryKey: key, queryFn: ({ signal }) => api('/fixture', { signal }) }).then(data => ({ data }), (error: unknown) => ({ error }));
  const signal = await started.promise;
  await client.cancelQueries({ queryKey: key });
  expect(signal.aborted).toBe(true);
  const outcome = await result;
  if (cached) expect(outcome).toEqual({ data: { previous: true } });
  else { expect('error' in outcome && outcome.error).toBeInstanceOf(CancelledError); expect(client.getQueryState(key)?.error).toBeNull(); }
  expect(client.getQueryState(key)?.fetchStatus).toBe('idle');
  expect(fetcher).toHaveBeenCalledOnce(); client.clear();
});
it('removing the final observer aborts a query that consumed its signal', async () => {
  const client = createQueryClient();
  const started = deferred<AbortSignal>();
  const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    const signal = init!.signal!;
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    started.resolve(signal);
  }));
  const api = createApiClient({ fetch: fetcher });
  const observer = new QueryObserver(client, { queryKey: ['fixture'], queryFn: ({ signal }) => api('/fixture', { signal }) });
  const unsubscribe = observer.subscribe(() => undefined);
  const signal = await started.promise;
  unsubscribe();
  expect(signal.aborted).toBe(true);
  expect(client.getQueryState(['fixture'])?.error).toBeNull();
  client.clear();
});
it('independently aborted Fetch is native cancellation, not TanStack CancelledError or network error', async () => {
  const client = createQueryClient();
  const controller = new AbortController();
  const started = deferred<void>();
  const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    started.resolve();
  }));
  const api = createApiClient({ fetch: fetcher });
  const result = client.fetchQuery({ queryKey: ['fixture'], queryFn: () => api('/fixture', { signal: controller.signal }) }).catch((error: unknown) => error);
  await started.promise;
  controller.abort();
  const error = await result;
  expect(error).toBe(controller.signal.reason);
  expect(error).not.toBeInstanceOf(CancelledError);
  expect(fetcher).toHaveBeenCalledOnce(); client.clear();
});
