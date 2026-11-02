import { act, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError, networkMessage } from '../../core/api/api-error';
import { queryKeys } from '../../core/query/query-keys';
import type { DashboardResponse } from '../../lib/dto/dashboard';
import { deferred, errorBody } from '../../test/fixtures/api-fixtures';
import { emptyDashboard, overflowDashboard, populatedDashboard } from '../../test/fixtures/dashboard-fixtures';
import { mockDashboard, renderDashboard, installDashboardTestEnvironment } from './dashboard-test-utils';

installDashboardTestEnvironment();

describe('routing and shell integration', () => {
  it('renders the authenticated dashboard at /dashboard inside the shell with Dashboard active', async () => {
    const get = mockDashboard(populatedDashboard());
    renderDashboard();
    expect(await screen.findByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(document.title).toBe('Dashboard — UpTrack');
    expect(get).toHaveBeenCalledTimes(1);
    expect(typeof get.mock.calls[0]?.[0]?.signal?.aborted).toBe('boolean');
  });
  it('denies a guest the dashboard: redirects to the login entry without requesting data', async () => {
    const get = mockDashboard(populatedDashboard());
    const { router } = renderDashboard('guest');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(new URLSearchParams(router.state.location.search).get('returnTo')).toBe('/dashboard');
    expect(screen.queryByText('Live compliance overview')).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it('legacy /app/dashboard lands on the real dashboard', async () => {
    mockDashboard(emptyDashboard);
    const { router } = renderDashboard('authenticated', { path: '/app/dashboard' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(await screen.findByText('No credentials yet')).toBeVisible();
  });
  it('uses the shared query key and does not override the M05 retry policy', async () => {
    mockDashboard(populatedDashboard());
    const { client } = renderDashboard();
    await screen.findByRole('group', { name: 'Total Credentials: 4' });
    const query = client.getQueryCache().find({ queryKey: queryKeys.dashboard() });
    expect(query).toBeDefined();
    // The hook sets no retry of its own: the query inherits whatever the shared client defines (M05 policy in production).
    expect(query?.options.retry).toBe(client.getDefaultOptions().queries?.retry);
    const options = query?.options as { placeholderData?: unknown; initialData?: unknown } | undefined;
    expect(options?.placeholderData).toBeUndefined();
    expect(options?.initialData).toBeUndefined();
  });
});

describe('loading', () => {
  it('shows an accessible loading state and no fabricated metrics until data arrives', async () => {
    const gate = deferred<DashboardResponse>();
    mockDashboard(() => gate.promise);
    renderDashboard();
    expect(await screen.findByText('Loading dashboard…')).toBeVisible();
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.queryByText('No credentials yet')).not.toBeInTheDocument();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).not.toBeInTheDocument();
    await act(async () => { gate.resolve(populatedDashboard()); await gate.promise; });
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
  });
});

describe('success', () => {
  it('renders actual API results with accessible labels', async () => {
    mockDashboard(populatedDashboard());
    renderDashboard();
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    for (const label of ['Active: 2', 'Expiring Soon: 1', 'Expired: 1']) expect(screen.getByRole('group', { name: label })).toBeVisible();
    expect(screen.getByText(/Good morning, Fixture/)).toBeVisible();
    expect(screen.getByText('Monday, November 2, 2026')).toBeVisible();
    const expirations = screen.getByRole('region', { name: 'Upcoming Expirations' });
    expect(within(expirations).getByText('30d left')).toBeVisible();
    expect(within(expirations).getByText('4 CE hrs still needed')).toBeVisible();
    const ce = screen.getByRole('region', { name: 'CEs Still Needed' });
    expect(within(ce).getByText('2 items')).toBeVisible();
    expect(within(ce).getByText('15.5/20 hrs')).toBeVisible();
    expect(within(ce).getByRole('progressbar', { name: 'A RN License CE progress' })).toHaveAttribute('aria-valuenow', '78');
    const activity = screen.getByRole('region', { name: 'Recent Activity' });
    expect(within(activity).getAllByRole('listitem')).toHaveLength(4);
    expect(within(activity).getByText('Uploaded certificate')).toBeVisible();
    expect(within(activity).getByText('A Neonatal Program (PDF)')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Add (Credential|CE Record)/ })).not.toBeInTheDocument();
  });
  it('omits no panel copy for empty panels of a populated account', async () => {
    mockDashboard({ ...populatedDashboard(), upcomingExpirations: [], ceAttention: [], recentActivity: [] });
    renderDashboard();
    expect(await screen.findByText('No upcoming expirations')).toBeVisible();
    expect(screen.getByText('No pending CE items')).toBeVisible();
    expect(screen.getByText('No recent activity')).toBeVisible();
  });
  it('rows deep-link to the credentials route', async () => {
    mockDashboard(populatedDashboard());
    const { router, user } = renderDashboard();
    const row = await screen.findByRole('link', { name: /A ACLS Certification.*30d left/s });
    expect(row).toHaveAttribute('href', '/credentials?credentialId=A-acls');
    await user.click(row);
    await waitFor(() => expect(router.state.location.pathname + router.state.location.search).toBe('/credentials?credentialId=A-acls'));
  });
});

describe('empty account', () => {
  it('shows zero metrics and guidance, distinct from a failure', async () => {
    mockDashboard(emptyDashboard);
    renderDashboard();
    expect(await screen.findByText('No credentials yet')).toBeVisible();
    expect(screen.getByText(/Add your first credential to start tracking/)).toBeVisible();
    for (const label of ['Total Credentials: 0', 'Active: 0', 'Expiring Soon: 0', 'Expired: 0']) expect(screen.getByRole('group', { name: label })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('failures', () => {
  it.each([
    ['network', new ApiError('network', 0, networkMessage)],
    ['server', new ApiError('http', 500, 'x', errorBody(500))],
    ['forbidden', new ApiError('http', 403, 'x', errorBody(403))],
    ['missing', new ApiError('http', 404, 'x', errorBody(404))],
  ])('shows a retryable error for a %s failure and recovers on Retry, without signing out', async (_name, error) => {
    let fail = true;
    mockDashboard(async () => { if (fail) throw error; return populatedDashboard(); });
    const { store, user } = renderDashboard();
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Dashboard unavailable')).toBeVisible();
    expect(within(alert).getByText('We could not load the dashboard right now. Please try again.')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(store.getSnapshot().status).toBe('authenticated');
    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the loaded data and offers Retry when a background refetch fails in the same session', async () => {
    let fail = false;
    mockDashboard(async () => { if (fail) throw new ApiError('http', 500, 'x', errorBody(500)); return populatedDashboard(); });
    const { client, user } = renderDashboard();
    expect(await screen.findByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    fail = true;
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.dashboard() }); });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Dashboard may be out of date')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('group', { name: 'Total Credentials: 4' })).toBeVisible();
  });
});

describe('overflow drawer', () => {
  it('opens the expirations list from "See more", links rows, closes on Escape and returns focus', async () => {
    mockDashboard(overflowDashboard());
    const { user } = renderDashboard();
    const trigger = await screen.findByRole('button', { name: 'See more upcoming expirations' });
    expect(trigger).toHaveTextContent('See 2 more expirations');
    expect(within(screen.getByRole('region', { name: 'Upcoming Expirations' })).getAllByRole('link')).toHaveLength(3);
    expect(within(screen.getByRole('region', { name: 'CEs Still Needed' })).getByText('5 items')).toBeVisible();
    await user.click(trigger);
    const drawer = await screen.findByRole('dialog', { name: 'All Upcoming Expirations' });
    expect(within(drawer).getByText('5 credentials · sorted by urgency')).toBeVisible();
    expect(within(drawer).getAllByRole('link')).toHaveLength(5);
    expect(within(drawer).getAllByRole('link')[0]).toHaveAttribute('href', '/credentials?credentialId=s-0');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All Upcoming Expirations' })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('opens the CE list ordered by lowest completion', async () => {
    mockDashboard(overflowDashboard());
    const { user } = renderDashboard();
    await user.click(await screen.findByRole('button', { name: 'See more pending CE items' }));
    const drawer = await screen.findByRole('dialog', { name: 'Credentials Needing CE Attention' });
    expect(within(drawer).getByText('5 credentials · lowest completion first')).toBeVisible();
    expect(within(drawer).getAllByRole('link')[0]).toHaveAccessibleName(/Soon 1/);
    expect(within(drawer).getAllByRole('progressbar')).toHaveLength(5);
  });
});
