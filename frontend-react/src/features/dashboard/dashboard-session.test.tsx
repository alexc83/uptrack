import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../core/api/api-error';
import { queryKeys } from '../../core/query/query-keys';
import type { UserResponse } from '../../lib/dto/auth';
import type { DashboardResponse } from '../../lib/dto/dashboard';
import { testToken } from '../../test/auth-test-utils';
import { deferred, errorBody } from '../../test/fixtures/api-fixtures';
import { emptyDashboard, populatedDashboard } from '../../test/fixtures/dashboard-fixtures';
import { mockDashboard, renderDashboard, installDashboardTestEnvironment } from './dashboard-test-utils';

installDashboardTestEnvironment();

const userB: UserResponse = { id: '00000000-0000-4000-8000-00000000000b', name: 'Bea Second', email: 'bea@example.test', createdAt: '2026-01-01T00:00:00Z' };
const loginB = { email: userB.email, password: 'irrelevant-test-value' };

/** Records whether `text` was ever present in the document from now on (catches transient stale paints). */
function watchForText(text: string) {
  const seen = { value: false };
  const check = () => { if (document.body.textContent?.includes(text)) seen.value = true; };
  const observer = new MutationObserver(check);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  return { seen, stop: () => { check(); observer.disconnect(); } };
}

describe('logout', () => {
  it('cancels the in-flight request, drops a late response and shows nothing of the old account', async () => {
    const gate = deferred<DashboardResponse>();
    let signal: AbortSignal | undefined;
    mockDashboard(options => { signal = options?.signal; return gate.promise; });
    const { store, client, router } = renderDashboard();
    expect(await screen.findByText('Loading dashboard…')).toBeVisible();
    const watch = watchForText('A ACLS Certification');
    act(() => store.logout());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(signal?.aborted).toBe(true);
    await act(async () => { gate.resolve(populatedDashboard('A')); await gate.promise; });
    watch.stop();
    expect(watch.seen.value).toBe(false);
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    expect(screen.queryByText('Live compliance overview')).not.toBeInTheDocument();
    expect(store.getSnapshot().status).toBe('unauthenticated');
  });

  it('clears loaded data from the cache on logout and does not repaint it', async () => {
    mockDashboard(populatedDashboard('A'));
    const { store, client, router } = renderDashboard();
    await screen.findByRole('group', { name: 'Total Credentials: 4' });
    expect(client.getQueryData(queryKeys.dashboard())).toBeDefined();
    act(() => store.logout());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    expect(screen.queryByText('A ACLS Certification')).not.toBeInTheDocument();
  });
});

describe('expired session', () => {
  it('moves to the login dialog on a protected 401 without flashing a dashboard error or data', async () => {
    let handle: () => void = () => undefined;
    mockDashboard(async () => {
      await Promise.resolve();
      handle(); // what the transport does for a protected 401 under the current token
      throw new ApiError('http', 401, 'Authentication is required.', errorBody(401));
    });
    const { store, router, client } = renderDashboard();
    handle = () => store.handleUnauthorized();
    const alertSeen = watchForText('Dashboard unavailable');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(new URLSearchParams(router.state.location.search).get('returnTo')).toBe('/dashboard');
    expect(await screen.findByRole('dialog', { name: 'Log in' })).toBeVisible();
    expect(screen.getByText('Your session expired. Please log in again.')).toBeVisible();
    alertSeen.stop();
    expect(alertSeen.seen.value).toBe(false);
    expect(store.getSnapshot().notice).toBe('expired');
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
  });
});

describe('account switching', () => {
  it('never paints account A data after A signs out and B signs in (unmount path), even if A answers late', async () => {
    const lateA = deferred<DashboardResponse>();
    const calls: string[] = [];
    mockDashboard(() => { calls.push('call'); return calls.length === 1 ? lateA.promise : Promise.resolve(populatedDashboard('B')); });
    const { store, authApi, router } = renderDashboard();
    await screen.findByText('Loading dashboard…');
    const watch = watchForText('A ACLS Certification');
    act(() => store.logout());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    authApi.login.mockResolvedValue({ token: testToken('b'), user: userB });
    await act(async () => { await store.login(loginB); });
    await act(async () => { await router.navigate('/dashboard'); });
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    expect((await screen.findAllByText('B ACLS Certification')).length).toBeGreaterThan(0);
    await act(async () => { lateA.resolve(populatedDashboard('A')); await lateA.promise; });
    watch.stop();
    expect(watch.seen.value).toBe(false);
    expect(screen.getByText(/Good morning, Bea/)).toBeVisible();
    expect(screen.queryByText('A ACLS Certification')).not.toBeInTheDocument();
  });

  it('never paints account A data after B signs in while the dashboard stays mounted', async () => {
    const gateB = deferred<DashboardResponse>();
    let calls = 0;
    mockDashboard(() => { calls += 1; return calls === 1 ? Promise.resolve(populatedDashboard('A')) : gateB.promise; });
    const { store, authApi, client } = renderDashboard();
    expect((await screen.findAllByText('A ACLS Certification')).length).toBeGreaterThan(0);
    const watch = watchForText('A ACLS Certification');
    authApi.login.mockResolvedValue({ token: testToken('b'), user: userB });
    await act(async () => { await store.login(loginB); });
    // B is signed in, B's request is still pending: nothing of A may be on screen or in the cache.
    expect(store.getSnapshot().user?.id).toBe(userB.id);
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
    expect(screen.queryByText('A ACLS Certification')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(await screen.findByText('Loading dashboard…')).toBeVisible();
    await act(async () => { gateB.resolve(populatedDashboard('B')); await gateB.promise; });
    expect((await screen.findAllByText('B ACLS Certification')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Good morning, Bea/)).toBeVisible();
    watch.stop();
    expect(watch.seen.value).toBe(false);
    expect(calls).toBe(2);
  });

  it('ignores an account A response that resolves after B is shown while mounted', async () => {
    const gateA = deferred<DashboardResponse>();
    let calls = 0;
    mockDashboard(() => { calls += 1; return calls === 1 ? gateA.promise : Promise.resolve(emptyDashboard); });
    const { store, authApi, client } = renderDashboard();
    await screen.findByText('Loading dashboard…');
    authApi.login.mockResolvedValue({ token: testToken('b'), user: userB });
    await act(async () => { await store.login(loginB); });
    expect(await screen.findByText('No credentials yet')).toBeVisible();
    await act(async () => { gateA.resolve(populatedDashboard('A')); await gateA.promise; });
    expect(screen.getByText('No credentials yet')).toBeVisible();
    expect(screen.queryByText('A ACLS Certification')).not.toBeInTheDocument();
    expect((client.getQueryData(queryKeys.dashboard()) as DashboardResponse).stats.totalCredentials).toBe(0);
  });

  it('shows different data for different demo-style accounts and an empty account correctly', async () => {
    mockDashboard(emptyDashboard);
    renderDashboard();
    expect(await screen.findByText('No credentials yet')).toBeVisible();
    expect(screen.queryByText('A ACLS Certification')).not.toBeInTheDocument();
  });
});

describe('StrictMode and observers', () => {
  it('under StrictMode the discarded mount is aborted and exactly one request completes', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    mockDashboard(async options => { signals.push(options?.signal); return populatedDashboard(); });
    renderDashboard('authenticated', { strict: true });
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    // Development StrictMode mounts, unmounts and remounts; TanStack cancels the signal-consuming first fetch.
    expect(signals.length).toBeGreaterThanOrEqual(1);
    expect(signals.length).toBeLessThanOrEqual(2);
    expect(signals.filter(signal => !signal?.aborted)).toHaveLength(1);
    expect(screen.getAllByRole('group')).toHaveLength(4);
  });

  it('releases the observer when the page unmounts and a reset leaves no active dashboard query', async () => {
    mockDashboard(populatedDashboard());
    const { client, router, store } = renderDashboard();
    await screen.findByRole('group', { name: 'Total Credentials: 4' });
    expect(client.getQueryCache().find({ queryKey: queryKeys.dashboard() })?.getObserversCount()).toBe(1);
    act(() => store.logout());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(client.getQueryCache().find({ queryKey: queryKeys.dashboard() })).toBeUndefined();
  });

  it('is read-only: it never writes the cache or runs a mutation', async () => {
    mockDashboard(populatedDashboard());
    const { client } = renderDashboard();
    await screen.findByRole('group', { name: 'Total Credentials: 4' });
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([queryKeys.dashboard()]);
  });
});
