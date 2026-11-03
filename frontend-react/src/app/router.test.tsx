import { credentialsApi } from '../core/api/credentials-api';
import { credential as credentialFixture } from '../test/fixtures/api-fixtures';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { routes } from './router';
import { renderWithProviders } from '../test/render-with-providers';

it('renders the labelled shell placeholder without consuming query strings: /settings', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
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
it('keeps the report preview outside the shell and leaves returnTo untouched', async () => {
  const { router } = renderWithProviders(null, { routes, path: '/credentials/preview/ce-report?returnTo=%2Fdashboard', session: 'authenticated' });
  expect(await screen.findByRole('heading', { level: 1, name: 'CE Report' })).toBeVisible();
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  expect(router.state.location.search).toBe('?returnTo=%2Fdashboard');
});

// M09: these routing/auth tests now reach the real credential page.
beforeEach(() => {
  vi.spyOn(credentialsApi, 'list').mockResolvedValue([]);
  vi.spyOn(credentialsApi, 'get').mockResolvedValue(credentialFixture);
});
