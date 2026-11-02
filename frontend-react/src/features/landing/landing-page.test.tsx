import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app/router';
import { renderWithProviders } from '../../test/render-with-providers';

const hero = 'Track credentials. Stay compliant. Own your career.';

describe('LandingPage', () => {
  it('renders all seven sections with Angular copy for a guest', async () => {
    renderWithProviders(null, { routes, path: '/' });
    expect(await screen.findByRole('heading', { level: 1, name: hero })).toBeVisible();
    // Header brand + auth nav
    expect(screen.getByRole('link', { name: 'UpTrack home' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Authentication' })).toBeVisible();
    // Dashboard + drawer previews
    expect(screen.getByAltText('UpTrack dashboard preview')).toBeVisible();
    expect(screen.getByAltText('UpTrack credential drawer preview')).toBeVisible();
    // Feature cards
    for (const name of ['Credential Tracking', 'CE Progress Monitoring', 'Certificate Storage', 'Expiration Alerts']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeVisible();
    }
    // Compliance benefits
    for (const name of ['Smart status tracking', 'CE progress visualization', 'Upcoming expirations', 'Audit-ready records']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeVisible();
    }
    expect(screen.getByRole('heading', { level: 2, name: 'Everything you need to stay compliant' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Your compliance status, at a glance' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Start tracking your credentials today' })).toBeVisible();
    // Footer (technology reference corrected to React per approved decision)
    expect(screen.getByText('Designed for healthcare professionals, powered by React and Spring Boot')).toBeVisible();
    expect(screen.getByText('© 2026 UpTrack')).toBeVisible();
    expect(document.title).toBe('UpTrack — Credential & CE Tracking');
  });

  it('opens the login dialog from Log In and restores focus to it on close', async () => {
    const { router, user: person } = renderWithProviders(null, { routes, path: '/' });
    const trigger = await screen.findByRole('button', { name: 'Log In' });
    await person.click(trigger);
    const dialog = await screen.findByRole('dialog', { name: 'Log in' });
    expect(dialog).toBeVisible();
    expect(new URLSearchParams(router.state.location.search).get('auth')).toBe('login');
    await person.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('opens the register dialog from each signup trigger and restores focus', async () => {
    const { router, user: person } = renderWithProviders(null, { routes, path: '/' });
    await screen.findByRole('heading', { level: 1, name: hero });
    for (const name of ['Sign Up', 'Get Started', 'Get Started for Free']) {
      const trigger = screen.getByRole('button', { name });
      await person.click(trigger);
      expect(await screen.findByRole('dialog', { name: 'Sign up' })).toBeVisible();
      expect(new URLSearchParams(router.state.location.search).get('auth')).toBe('register');
      await person.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    }
  });

  it('opens the dialog from ?auth= and keeps returnTo when the dialog closes', async () => {
    const { router, user: person } = renderWithProviders(null, { routes, path: '/?auth=login&returnTo=%2Fcredentials' });
    expect(await screen.findByRole('dialog', { name: 'Log in' })).toBeVisible();
    await person.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('auth')).toBeNull();
    expect(params.get('returnTo')).toBe('/credentials');
  });

  it('ignores an invalid auth parameter', async () => {
    renderWithProviders(null, { routes, path: '/?auth=signup' });
    expect(await screen.findByRole('heading', { level: 1, name: hero })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles the theme and persists the single uptrack-theme key', async () => {
    const { user: person } = renderWithProviders(null, { routes, path: '/' });
    const toggle = await screen.findByRole('button', { name: 'Switch to dark mode' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await person.click(toggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('uptrack-theme')).toBe('dark');
    expect(await screen.findByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('issues no API requests while a guest views the landing page', async () => {
    const { authApi } = renderWithProviders(null, { routes, path: '/' });
    expect(await screen.findByRole('heading', { level: 1, name: hero })).toBeVisible();
    expect(authApi.me).not.toHaveBeenCalled();
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
