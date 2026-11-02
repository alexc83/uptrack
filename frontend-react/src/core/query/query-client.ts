import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/api-error';
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'http' && error.status >= 500 && error.status <= 599 && failureCount < 2;
}
export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetryQuery },
      mutations: { retry: false },
    },
  });
  for (const queryKey of [['credential'], ['ce-record'], ['auth', 'me'], ['profile']]) client.setQueryDefaults(queryKey, { staleTime: 0 });
  return client;
}
