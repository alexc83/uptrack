import { screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { routes } from './router';
import { renderWithProviders } from '../test/render-with-providers';

it.each(['/dashboard', '/credentials?credentialId=preview', '/ce-records', '/settings'])('renders labelled shell placeholders without consuming query strings: %s', async path => {
  const { router } = renderWithProviders(null, { routes, path, session: 'authenticated' });
  expect(await screen.findByText('Migration preview — feature not implemented.')).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  expect(router.state.location.search).toBe(path.includes('?') ? '?credentialId=preview' : '');
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
