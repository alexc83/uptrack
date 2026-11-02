import { act, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AppShell } from './app-shell';
import { PageHeader } from './page-header';
import { installMatchMedia } from '../../test/match-media';
import { renderWithProviders } from '../../test/render-with-providers';

const routes = [{ element: <AppShell />, children: ['dashboard', 'credentials', 'ce-records', 'settings'].map(path => ({ path: `/${path}`, element: <PageHeader title={path} /> })) }];
it('persists desktop collapse and preserves accessible names and active route', async () => {
  const { user } = renderWithProviders(null, { routes, path: '/dashboard' });
  expect(screen.getByTestId('desktop-sidebar')).toHaveClass('w-[272px]');
  await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
  expect(localStorage.getItem('uptrack-sidebar-collapsed')).toBe('true');
  expect(screen.getByTestId('desktop-sidebar')).toHaveClass('w-[88px]');
  const credentials = screen.getByRole('link', { name: 'Credentials' });
  await user.click(credentials);
  await waitFor(() => expect(screen.getByRole('link', { name: 'Credentials' })).toHaveAttribute('aria-current', 'page'));
  await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
  expect(localStorage.getItem('uptrack-sidebar-collapsed')).toBe('false');
});
it('uses mobile through 768 and restores saved desktop collapse above it', async () => {
  const resize = installMatchMedia(768);
  localStorage.setItem('uptrack-sidebar-collapsed', 'true');
  const { user } = renderWithProviders(null, { routes, path: '/dashboard' });
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  act(() => resize(769));
  expect(screen.getByTestId('desktop-sidebar')).toHaveClass('w-[88px]');
  act(() => resize(767));
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
});
it('closes mobile navigation after a destination is selected', async () => {
  installMatchMedia(375);
  const { user } = renderWithProviders(null, { routes, path: '/dashboard' });
  await user.click(screen.getByRole('button', { name: 'Open navigation' }));
  await user.click(screen.getByRole('link', { name: 'CE Records' }));
  expect(await screen.findByRole('heading', { name: 'ce-records' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
