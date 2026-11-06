import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { routes } from './router';
import { isChunkLoadError } from './route-error';
import { renderWithProviders } from '../test/render-with-providers';

describe('route errors', () => {
  it.each(['Failed to fetch dynamically imported module: https://x/assets/a.js', 'error loading dynamically imported module', 'Importing a module script failed.', 'Unable to preload CSS for /assets/a.css'])('recognises a stale-chunk failure: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });
  it('does not mistake ordinary errors for a version mismatch', () => {
    expect(isChunkLoadError(new Error('boom'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it('recommends a refresh (without reloading) and keeps the session when a lazy page chunk is gone', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const broken = [{ errorElement: routes[0]?.errorElement, children: [{ path: '/broken', lazy: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: /assets/old.js')) }] }];
    const { store } = renderWithProviders(null, { routes: broken, path: '/broken', session: 'authenticated' });
    expect(await screen.findByRole('heading', { name: 'A new version of UpTrack is available' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh to load the latest version');
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    expect(reload).not.toHaveBeenCalled();
    expect(store.getSnapshot().status).toBe('authenticated');
    vi.unstubAllGlobals();
  });
});
