import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError, networkMessage } from '../../core/api/api-error';
import { checkBackendReady } from '../../core/api/health-api';
import { dashboardApi } from '../../core/api/dashboard-api';
import { credentialsApi } from '../../core/api/credentials-api';
import { emptyDashboard } from '../../test/fixtures/dashboard-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../core/api/health-api', () => ({ checkBackendReady: vi.fn() }));
const ready = vi.mocked(checkBackendReady);
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); ready.mockReset().mockResolvedValue(false); vi.spyOn(credentialsApi, 'list').mockResolvedValue([]); });
afterEach(() => vi.useRealTimers());
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

it('keeps a signed-in user signed in during an outage, shows a notice, and refreshes failed data on recovery', async () => {
  const get = vi.spyOn(dashboardApi, 'get').mockRejectedValue(new ApiError('network', 0, networkMessage));
  const { store } = renderWithProviders(null, { routes, path: '/dashboard', session: 'authenticated' });
  expect(await screen.findByText(new RegExp('You are still signed in'))).toBeVisible();
  expect(store.getSnapshot().status).toBe('authenticated');
  expect(screen.getByText(new RegExp('You are still signed in')).closest('[aria-live="polite"]')).not.toBeNull();
  await advance(60_000);
  expect(store.getSnapshot().status).toBe('authenticated');
  get.mockResolvedValue(emptyDashboard);
  ready.mockResolvedValue(true);
  await advance(15_000);
  expect(await screen.findByText(/UpTrack is available again/)).toBeVisible();
  expect(await screen.findByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
  await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(1));
  await advance(9_000);
  expect(screen.queryByText(/UpTrack is available again/)).not.toBeInTheDocument();
});

it('does not show an outage notice for application errors such as a 401-free 500 with an UpTrack message', async () => {
  vi.spyOn(dashboardApi, 'get').mockRejectedValue(new ApiError('http', 500, 'Something went wrong. Please try again.', { message: 'x' }));
  renderWithProviders(null, { routes, path: '/dashboard', session: 'authenticated' });
  await advance(5_000);
  expect(screen.queryByText(/You are still signed in/)).not.toBeInTheDocument();
  expect(ready).not.toHaveBeenCalled();
});
