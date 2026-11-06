import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '../../app/router';
import { renderWithProviders } from '../../test/render-with-providers';
import { helpArticles, helpArticlePath } from './help-content';

describe('Help Center routes', () => {
  it('renders the landing page publicly with all categories and 20 article links', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/help' });
    expect(await screen.findByRole('heading', { level: 1, name: 'UpTrack Help Center' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/help');
    const nav = screen.getByRole('navigation', { name: 'Help Center categories' });
    for (const article of helpArticles) expect(within(nav).getByRole('link', { name: article.title })).toHaveAttribute('href', helpArticlePath(article));
    expect(document.title).toBe('UpTrack Help Center — UpTrack');
  });

  it('renders an article with breadcrumbs, on-this-page, related links, title and description', async () => {
    renderWithProviders(null, { routes, path: '/help/credentials/add-a-credential' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Add a Credential' })).toBeVisible();
    expect(document.title).toBe('Add a Credential — UpTrack Help Center');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBeTruthy();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByRole('link', { name: 'Credentials' })).toHaveAttribute('href', '/help/credentials');
    expect(within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole('link').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Related articles' })).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Add a Credential', current: 'page' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to UpTrack' })).toHaveAttribute('href', '/');
  });

  it('renders each of the 20 articles at its stable URL', async () => {
    for (const article of helpArticles) {
      const { unmount } = renderWithProviders(null, { routes, path: helpArticlePath(article) });
      expect(await screen.findByRole('heading', { level: 1, name: article.title })).toBeVisible();
      unmount();
    }
  });

  it('shows a category page and a not-found state inside the Help Center', async () => {
    const first = renderWithProviders(null, { routes, path: '/help/troubleshooting' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Troubleshooting' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: /Log In|Upload|Saving/ }).length).toBeGreaterThan(0);
    first.unmount();
    renderWithProviders(null, { routes, path: '/help/credentials/does-not-exist' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Help Center categories' })).toBeVisible();
  });

  it('keeps an authenticated session intact', async () => {
    const { router, store } = renderWithProviders(null, { routes, path: '/help/getting-started/welcome-to-uptrack', session: 'authenticated' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome to UpTrack' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/help/getting-started/welcome-to-uptrack');
    expect(store.getSnapshot().status).toBe('authenticated');
  });

  it('searches client-side with keyboard selection and Escape to clear', async () => {
    const { user, router } = renderWithProviders(null, { routes, path: '/help' });
    const box = await screen.findByRole('combobox', { name: 'Search the Help Center' });
    await user.type(box, 'caps lock');
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveAccessibleName(/I Can't Log In/);
    expect(box).toHaveAttribute('aria-expanded', 'true');
    await user.type(box, '{Escape}');
    expect(box).toHaveValue('');
    await user.type(box, 'certificate');
    const list = await screen.findAllByRole('option');
    expect(list.length).toBeGreaterThan(2);
    await user.keyboard('{ArrowDown}');
    expect(box).toHaveAttribute('aria-activedescendant', list[1]?.id);
    const target = list[1]?.textContent ?? '';
    await user.keyboard('{Enter}');
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/help'));
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(target).toContain(heading.textContent ?? 'x');
    expect(screen.getByRole('combobox')).toHaveValue('');
  });

  it('reports an empty search result', async () => {
    const { user } = renderWithProviders(null, { routes, path: '/help' });
    await user.type(await screen.findByRole('combobox'), 'zzzzqqq');
    expect(await screen.findByText(/No articles match/)).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('No results found');
  });

  it('opens and closes the mobile menu with Escape and returns focus', async () => {
    const { user } = renderWithProviders(null, { routes, path: '/help' });
    const menu = await screen.findByRole('button', { name: 'Open Help Center menu' });
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });
});
