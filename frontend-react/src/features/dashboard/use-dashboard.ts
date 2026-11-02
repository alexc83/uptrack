import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../core/api/dashboard-api';
import { useSession } from '../../core/auth/session-context';
import { queryKeys } from '../../core/query/query-keys';
import { buildDashboardView, type DashboardView } from './dashboard-view';

export type DashboardState =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void; retrying: boolean }
  | { status: 'ready'; view: DashboardView; refreshFailed: boolean; retry: () => void; retrying: boolean };

/**
 * Read-only dashboard query. The cache holds the raw DTO under the shared key; no placeholder/initial data,
 * manual cache writes or custom retry. The query function forwards TanStack's AbortSignal so a session reset
 * (logout, 401, account change) cancels the request. A removed/reset query has no data, so it renders as
 * loading, never as the previous account's data.
 */
export function useDashboard(): DashboardState {
  const { user } = useSession();
  const query = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: ({ signal }) => dashboardApi.get({ signal }),
  });
  const name = user?.name ?? null;
  // "Now" is captured per successful load so greeting/day counts are stable between renders and testable.
  const now = useMemo(() => new Date(), [query.dataUpdatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = useMemo(
    () => (query.data ? buildDashboardView(query.data, name === null ? null : { name }, now) : null),
    [query.data, name, now],
  );
  const retry = () => { void query.refetch(); };
  if (view) return { status: 'ready', view, refreshFailed: query.isRefetchError, retry, retrying: query.isFetching };
  if (query.isError) return { status: 'error', retry, retrying: query.isFetching };
  return { status: 'loading' };
}
