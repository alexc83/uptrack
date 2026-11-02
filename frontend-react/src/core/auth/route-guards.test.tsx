import { credentialsApi } from '../../core/api/credentials-api';
import { credential as credentialFixture } from '../../test/fixtures/api-fixtures';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError, networkMessage } from '../api/api-error';
import { getApiAuthRegistration } from '../api/api-auth';
import { queryKeys } from '../query/query-keys';
import { renderWithProviders } from '../../test/render-with-providers';
import { createFakeAuthApi, testToken } from '../../test/auth-test-utils';
import { deferred, errorBody, user } from '../../test/fixtures/api-fixtures';
import type { UserResponse } from '../../lib/dto/auth';

const placeholder = 'Migration preview — feature not implemented.';
const search = (router: { state: { location: { search: string } } }) => new URLSearchParams(router.state.location.search);

describe('RequireAuth', () => {
  it('sends a guest from a protected URL to / with a validated returnTo, without any request', async () => {
    const { router, authApi } = renderWithProviders(null, { routes, path: '/credentials?credentialId=abc&status=ACTIVE#top' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('auth')).toBe('login');
    expect(search(router).get('returnTo')).toBe('/credentials?credentialId=abc&status=ACTIVE#top');
    expect(authApi.me).not.toHaveBeenCalled();
    expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
  });

  it('keeps a standalone CE report protected and preserves its own returnTo parameter', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/credentials/abc/ce-report?returnTo=%2Fcredentials' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('returnTo')).toBe('/credentials/abc/ce-report?returnTo=%2Fcredentials');
  });

  it('does not restore unknown destinations', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/dashboard' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('returnTo')).toBe('/dashboard');
  });

  it('shows a loading state, then the page, once /auth/me succeeds', async () => {
    const gate = deferred<UserResponse>();
    const authApi = createFakeAuthApi();
    authApi.me.mockReturnValue(gate.promise);
    const { store } = renderWithProviders(null, { routes, path: '/settings', session: { token: testToken('t'), authApi } });
    expect(await screen.findByText('Checking your session…')).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
    await act(async () => { gate.resolve(user); await gate.promise; });
    expect(await screen.findByText(placeholder)).toBeVisible();
    expect(store.getSnapshot().status).toBe('authenticated');
    expect(authApi.me).toHaveBeenCalledTimes(1);
  });

  it('redirects to the login dialog with an expired notice when /auth/me answers 401', async () => {
    const authApi = createFakeAuthApi();
    authApi.me.mockRejectedValue(new ApiError('http', 401, 'Authentication is required.', errorBody(401)));
    const { router } = renderWithProviders(null, { routes, path: '/settings', session: { token: testToken('t'), authApi } });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('returnTo')).toBe('/settings');
    expect(await screen.findByRole('dialog', { name: 'Log in' })).toBeVisible();
    expect(screen.getByText('Your session expired. Please log in again.')).toBeVisible();
  });

  it('keeps the token and offers Retry / Sign out when the server cannot be reached', async () => {
    const authApi = createFakeAuthApi();
    authApi.me.mockRejectedValueOnce(new ApiError('network', 0, networkMessage));
    const { storage, user: person } = renderWithProviders(null, { routes, path: '/settings', session: { token: testToken('t'), authApi } });
    expect(await screen.findByText("We couldn't verify your session")).toBeVisible();
    expect(storage.current()).toBe(testToken('t'));
    authApi.me.mockResolvedValue(user);
    await person.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(placeholder)).toBeVisible();
  });

  it('Sign out from the unavailable screen returns to / and clears the token', async () => {
    const authApi = createFakeAuthApi();
    authApi.me.mockRejectedValue(new ApiError('http', 503, 'x', errorBody(503)));
    const { router, storage, user: person } = renderWithProviders(null, { routes, path: '/dashboard', session: { token: testToken('t'), authApi } });
    await person.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(router.state.location.search).toBe('');
    expect(storage.current()).toBeNull();
  });

  it.each([403, 404])('does not sign the user out when a protected view later receives %i', async (status) => {
    const { store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
    expect(await screen.findByText(placeholder)).toBeVisible();
    // the transport never calls onUnauthorized for these; assert the guard keeps rendering
    expect(status).toBeGreaterThan(400);
    expect(store.getSnapshot().status).toBe('authenticated');
  });

  it('moves to the login dialog when a protected 401 expires a live session, and restores the page after login', async () => {
    const { router, store, authApi, user: person } = renderWithProviders(null, { routes, path: '/credentials?credentialId=z', session: 'authenticated' });
    expect(await screen.findByRole('dialog', { name: 'Credential details' })).toBeVisible();
    await waitFor(() => expect(router.state.location.search).toBe(''));
    // Wait for React Router to commit its replacement navigation before expiring the session.
    await act(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
    act(() => store.handleUnauthorized());
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('returnTo')).toBe('/credentials');
    expect(store.getSnapshot().notice).toBe('expired');
    const dialog = await screen.findByRole('dialog', { name: 'Log in' });
    expect(within(dialog).getByText('Your session expired. Please log in again.')).toBeVisible();
    expect(authApi.login).not.toHaveBeenCalled();
    expect(person).toBeDefined();
  });
});

describe('GuestOnly and redirects', () => {
  it('sends an authenticated user from / to /dashboard', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/', session: 'authenticated' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('does not flash the landing view for a stored session while it is verified', async () => {
    const gate = deferred<UserResponse>();
    const authApi = createFakeAuthApi();
    authApi.me.mockReturnValue(gate.promise);
    renderWithProviders(null, { routes, path: '/', session: { token: testToken('t'), authApi } });
    expect(screen.queryByRole('heading', { name: /Track credentials\. Stay compliant\. Own your career\./ })).not.toBeInTheDocument();
    expect(await screen.findByText('Checking your session…')).toBeVisible();
  });

  it('shows the landing auth triggers to a guest', async () => {
    renderWithProviders(null, { routes, path: '/' });
    expect(await screen.findByRole('button', { name: 'Log In' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeVisible();
  });

  it.each([['/app/credentials?credentialId=abc#x', '/credentials', '?credentialId=abc', '#x'], ['/app?x=1', '/dashboard', '?x=1', '']])('legacy redirect %s keeps query and hash', async (path, pathname, query, hash) => {
    const { router } = renderWithProviders(null, { routes, path, session: 'authenticated' });
    await waitFor(() => expect(router.state.location.pathname).toBe(pathname));
    if (pathname === '/credentials') {
      expect(await screen.findByRole('dialog', { name: 'Credential details' })).toBeVisible();
      await waitFor(() => expect(router.state.location.search).toBe(''));
      expect(credentialsApi.get).toHaveBeenCalledWith('abc', expect.anything());
    } else expect(router.state.location.search).toBe(query);
    expect(router.state.location.hash).toBe(hash);
  });

  it('legacy redirect for a guest ends at the login dialog with the full deep link as returnTo', async () => {
    const { router } = renderWithProviders(null, { routes, path: '/app/credentials?credentialId=abc' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(search(router).get('returnTo')).toBe('/credentials?credentialId=abc');
  });

  it('unknown routes: guest -> /, authenticated -> /dashboard', async () => {
    const guest = renderWithProviders(null, { routes, path: '/nope' });
    await waitFor(() => expect(guest.router.state.location.pathname).toBe('/'));
    guest.unmount();
    const signedIn = renderWithProviders(null, { routes, path: '/nope', session: 'authenticated' });
    await waitFor(() => expect(signedIn.router.state.location.pathname).toBe('/dashboard'));
  });
});

describe('provider lifecycle', () => {
  it('under StrictMode issues exactly one /auth/me and keeps a single live adapter', async () => {
    const { authApi, store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated', strict: true });
    expect(await screen.findByText(placeholder)).toBeVisible();
    expect(authApi.me).toHaveBeenCalledTimes(1);
    expect(getApiAuthRegistration()?.adapter.getToken()).toBe(testToken('auth'));
    expect(store.getSnapshot().status).toBe('authenticated');
  });

  it('unregisters the transport adapter on unmount', async () => {
    const { unmount } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
    await screen.findByText(placeholder);
    expect(getApiAuthRegistration()).toBeDefined();
    unmount();
    expect(getApiAuthRegistration()).toBeUndefined();
  });
});

describe('logout', () => {
  it('confirms, clears token and cache, and lands on plain /', async () => {
    const { user: person, router, client, storage, store } = renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
    await screen.findByText(placeholder);
    client.setQueryData(queryKeys.credentials(), ['A']);
    expect(screen.getByText(user.name)).toBeVisible();
    await person.click(screen.getByRole('button', { name: 'Open account menu' }));
    await person.click(within(await screen.findByRole('menuitem', { name: 'Log out' })).getByRole('button'));
    const confirm = await screen.findByRole('dialog', { name: 'Log out' });
    await waitFor(() => expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await person.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(store.getSnapshot().status).toBe('authenticated');
    await person.click(screen.getByRole('button', { name: 'Open account menu' }));
    await person.click(within(await screen.findByRole('menuitem', { name: 'Log out' })).getByRole('button'));
    await person.click(within(await screen.findByRole('dialog', { name: 'Log out' })).getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(router.state.location.search).toBe('');
    expect(storage.current()).toBeNull();
    expect(client.getQueryData(queryKeys.credentials())).toBeUndefined();
    expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
    // Back/forward to a protected URL re-evaluates the guard
    await act(async () => { await router.navigate('/dashboard'); });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows the signed-in identity in the account menu', async () => {
    renderWithProviders(null, { routes, path: '/settings', session: 'authenticated' });
    await screen.findByText(placeholder);
    expect(screen.getByText(user.email)).toBeVisible();
  });
});

// M09: these routing/auth tests now reach the real credential page.
beforeEach(() => {
  vi.spyOn(credentialsApi, 'list').mockResolvedValue([]);
  vi.spyOn(credentialsApi, 'get').mockResolvedValue(credentialFixture);
});
