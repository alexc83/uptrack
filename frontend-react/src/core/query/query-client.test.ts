import { expect, it, vi } from 'vitest';
import { MutationObserver } from '@tanstack/react-query';
import { ApiError } from '../api/api-error';
import { createQueryClient, shouldRetryQuery } from './query-client';
import { queryKeys } from './query-keys';

it.each([500, 502, 503, 599])('permits exactly two retries for HTTP %s', status => {
  expect([0, 1, 2, 3].map(count => shouldRetryQuery(count, new ApiError('http', status)))).toEqual([true, true, false, false]);
});
it.each([
  new ApiError('http', 400), new ApiError('http', 401), new ApiError('http', 403), new ApiError('http', 404), new ApiError('http', 409), new ApiError('http', 429),
  new ApiError('network', 0), new ApiError('response', 200), new ApiError('response', 502), new DOMException('fixture', 'AbortError'), new TypeError('fixture'), { status: 503 },
])('does not retry non-eligible errors %#', error => {
  expect(shouldRetryQuery(0, error)).toBe(false);
});
it('reuses fresh list/dashboard results but refreshes detail/report results', async () => {
  const client = createQueryClient();
  const list = vi.fn(async () => []);
  const dashboard = vi.fn(async () => ({}));
  const detail = vi.fn(async () => ({}));
  const report = vi.fn(async () => ({}));
  for (let i = 0; i < 2; i++) {
    await client.fetchQuery({ queryKey: queryKeys.credentials(), queryFn: list });
    await client.fetchQuery({ queryKey: queryKeys.dashboard(), queryFn: dashboard });
    await client.fetchQuery({ queryKey: queryKeys.credential('fixture'), queryFn: detail });
    await client.fetchQuery({ queryKey: queryKeys.credentialCEReport('fixture'), queryFn: report });
  }
  expect(list).toHaveBeenCalledOnce(); expect(dashboard).toHaveBeenCalledOnce();
  expect(detail).toHaveBeenCalledTimes(2); expect(report).toHaveBeenCalledTimes(2);
  client.clear();
});
it('expires list freshness after thirty seconds', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
  const client = createQueryClient();
  const queryFn = vi.fn(async () => []);
  await client.fetchQuery({ queryKey: queryKeys.credentials(), queryFn });
  clock.mockReturnValue(1_029_999);
  await client.fetchQuery({ queryKey: queryKeys.credentials(), queryFn });
  expect(queryFn).toHaveBeenCalledOnce();
  clock.mockReturnValue(1_030_001);
  await client.fetchQuery({ queryKey: queryKeys.credentials(), queryFn });
  expect(queryFn).toHaveBeenCalledTimes(2);
  client.clear();
});
it('never retries a failed mutation', async () => {
  const client = createQueryClient();
  const mutationFn = vi.fn(async () => { throw new ApiError('http', 503); });
  const observer = new MutationObserver(client, { mutationFn });
  await expect(observer.mutate()).rejects.toMatchObject({ status: 503 });
  expect(mutationFn).toHaveBeenCalledOnce();
  client.clear();
});
