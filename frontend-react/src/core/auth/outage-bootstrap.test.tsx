import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError, networkMessage, slowRequestMessage, timeoutMessage } from '../api/api-error';
import { checkBackendReady } from '../api/health-api';
import { createFakeAuthApi, testToken } from '../../test/auth-test-utils';
import { deferred, user } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../api/health-api', () => ({ checkBackendReady: vi.fn() }));
const ready = vi.mocked(checkBackendReady);
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); ready.mockReset().mockResolvedValue(false); });
afterEach(() => vi.useRealTimers());
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

it('shows a slow notice while a returning user\'s session check is slow', async () => {
  const gate = deferred<typeof user>();
  const authApi = createFakeAuthApi();
  authApi.me.mockReturnValue(gate.promise);
  renderWithProviders(null, { routes, path: '/settings', session: { token: testToken('t'), authApi } });
  expect(await screen.findByText('Checking your session…')).toBeVisible();
  expect(screen.queryByText(slowRequestMessage)).not.toBeInTheDocument();
  await advance(10_500);
  expect(await screen.findByText(slowRequestMessage)).toBeVisible();
});

it.each([
  ['timeout', new ApiError('timeout', 0, timeoutMessage)],
  ['503', new ApiError('http', 503, networkMessage, '')],
  ['network', new ApiError('network', 0, networkMessage)],
])('keeps the stored sign-in during a %s outage and recovers by itself without re-entering credentials', async (_label, error) => {
  const authApi = createFakeAuthApi();
  authApi.me.mockRejectedValueOnce(error);
  const { storage, store } = renderWithProviders(null, { routes, path: '/preview', session: { token: testToken('t'), authApi } });
  expect(await screen.findByText("We couldn't verify your session")).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent(networkMessage);
  expect(storage.current()).toBe(testToken('t'));
  await advance(120_000);
  expect(authApi.me).toHaveBeenCalledTimes(1);
  expect(authApi.login).not.toHaveBeenCalled();
  authApi.me.mockResolvedValue(user);
  ready.mockResolvedValue(true);
  await advance(15_000);
  await waitFor(() => expect(store.getSnapshot().status).toBe('authenticated'));
  expect(authApi.me).toHaveBeenCalledTimes(2);
  expect(authApi.login).not.toHaveBeenCalled();
  expect(storage.current()).toBe(testToken('t'));
});

it('an expired token (401) is still an expiry, not an outage', async () => {
  const authApi = createFakeAuthApi();
  authApi.me.mockRejectedValue(new ApiError('http', 401, 'Authentication is required.', { status: 401 }));
  const { storage } = renderWithProviders(null, { routes, path: '/settings', session: { token: testToken('t'), authApi } });
  expect(await screen.findByRole('dialog', { name: 'Log in' })).toBeVisible();
  expect(storage.current()).toBeNull();
  expect(ready).not.toHaveBeenCalled();
});
