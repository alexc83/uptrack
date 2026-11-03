import { credentialsApi } from '../core/api/credentials-api';
import { dashboardApi } from '../core/api/dashboard-api';
import { usersApi } from '../core/api/users-api';
import { ceReport, credential as credentialFixture, user as userFixture } from '../test/fixtures/api-fixtures';
import { emptyDashboard } from '../test/fixtures/dashboard-fixtures';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { routes } from './router';
import { renderWithProviders } from '../test/render-with-providers';

it('renders the M12 Settings page at /settings', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  expect(router.state.location.search).toBe('');
});
it('renders the labelled shell placeholder without consuming query strings: /preview', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/preview', session: 'authenticated' });
  expect(await screen.findByText('Migration preview — feature not implemented.')).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  expect(router.state.location.search).toBe('');
});
it('renders the M10 CE records page at /ce-records', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/ce-records', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: 'CE Records' })).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  expect(router.state.location.search).toBe('');
});
it.each([['/app', '/dashboard'], ['/app/dashboard', '/dashboard'], ['/app/credentials', '/credentials'], ['/app/ce-records', '/ce-records'], ['/unknown', '/dashboard']])('redirects an authenticated user from %s to %s', async (path, destination) => {
  const { router } = renderWithProviders(null, { routes, path, session: 'authenticated' });
  await waitFor(() => expect(router.state.location.pathname).toBe(destination));
});
it('renders the public roadmap at /roadmap for a guest', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/roadmap' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/roadmap');
});
it('renders the public roadmap at /roadmap for an authenticated user without redirecting', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/roadmap', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/roadmap');
});
it('navigates from the authenticated sidebar Roadmap link to /roadmap and keeps the session', async () => {
  vi.spyOn(dashboardApi, 'get').mockResolvedValue(emptyDashboard);
  const { router, user: person, store } = renderWithProviders(null, { routes, path: '/dashboard', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Live compliance overview' })).toBeVisible();
  await person.click(screen.getByRole('link', { name: 'Roadmap' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Product Roadmap' })).toBeVisible();
  expect(router.state.location.pathname).toBe('/roadmap');
  expect(store.getSnapshot().status).toBe('authenticated');
});
it('keeps the M11 CE report outside the shell and leaves returnTo untouched', async () => {
  vi.spyOn(credentialsApi, 'getCEReport').mockResolvedValue(structuredClone(ceReport));
  const { router } = renderWithProviders(null, { routes, path: '/credentials/preview/ce-report?returnTo=%2Fdashboard', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: credentialFixture.name })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(router.state.location.search).toBe('?returnTo=%2Fdashboard');
});

// M09, M12: these routing/auth tests now reach the real credential and settings pages.
beforeEach(() => {
  vi.spyOn(credentialsApi, 'list').mockResolvedValue([]);
  vi.spyOn(credentialsApi, 'get').mockResolvedValue(credentialFixture);
  vi.spyOn(usersApi, 'getProfile').mockResolvedValue(userFixture);
});
