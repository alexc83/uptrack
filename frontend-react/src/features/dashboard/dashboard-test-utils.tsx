import { afterEach, beforeEach, vi } from 'vitest';
import { routes } from '../../app/router';
import { credentialsApi } from '../../core/api/credentials-api';
import { dashboardApi } from '../../core/api/dashboard-api';
import type { DashboardResponse } from '../../lib/dto/dashboard';
import { dashboardNow } from '../../test/fixtures/dashboard-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';

export type DashboardGet = typeof dashboardApi.get;

/** Fixes only Date so waitFor/timers keep working; restores every spy between tests. */
export function installDashboardTestEnvironment() {
  // M13: the header's Add CE Record action reads the (default empty) credential list, like Angular's dashboard.
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(dashboardNow); vi.spyOn(credentialsApi, 'list').mockResolvedValue([]); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
}

export function mockDashboard(response: DashboardResponse | ((options?: Parameters<DashboardGet>[0]) => Promise<DashboardResponse>)) {
  return vi.spyOn(dashboardApi, 'get').mockImplementation(typeof response === 'function' ? response : async () => structuredClone(response));
}

export function renderDashboard(session: Parameters<typeof renderWithProviders>[1] extends infer O ? (O extends { session?: infer S } ? S : never) : never = 'authenticated', extra: { strict?: boolean; path?: string } = {}) {
  return renderWithProviders(null, { routes, path: extra.path ?? '/dashboard', session, strict: extra.strict });
}
