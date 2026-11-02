import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AccountMenu } from './account-menu';
import { renderWithProviders } from '../../test/render-with-providers';

it('opens by keyboard and routes Settings with origin state; logout remains unavailable', async () => {
  const { user, router } = renderWithProviders(<AccountMenu collapsed={false} onNavigate={vi.fn()} />, { path: '/credentials?example=1' });
  screen.getByRole('button', { name: 'Open account menu' }).focus();
  await user.keyboard('{Enter}');
  expect(screen.getByText('Preview account — not signed in')).toBeVisible();
  expect(screen.getByRole('button', { name: /Log out/ })).toBeDisabled();
  await user.click(screen.getByRole('link', { name: 'Settings' }));
  expect(router.state.location.pathname).toBe('/settings');
  expect(router.state.location.state).toEqual({ from: '/credentials?example=1' });
});
