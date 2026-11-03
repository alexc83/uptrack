import { credentialsApi } from '../../core/api/credentials-api';
import { credential as credentialFixture } from '../../test/fixtures/api-fixtures';
import { act, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError, networkMessage } from '../../core/api/api-error';
import { queryKeys } from '../../core/query/query-keys';
import { createFakeAuthApi, authResponseFor, testToken } from '../../test/auth-test-utils';
import { deferred, errorBody, user } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';

const open = (path = '/?auth=login') => renderWithProviders(null, { routes, path });
const dialog = (name: string) => screen.findByRole('dialog', { name });

describe('login dialog', () => {
  it('is labelled, focuses email, and exposes correct autocomplete/types', async () => {
    open();
    const d = await dialog('Log in');
    const email = within(d).getByLabelText('Email');
    const password = within(d).getByLabelText('Password');
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  it('shows field errors on submit, keeps the button enabled, and sends nothing', async () => {
    const { user: person, authApi } = open();
    const d = await dialog('Log in');
    const submit = within(d).getByRole('button', { name: 'Log in' });
    expect(submit).toBeEnabled();
    await person.click(submit);
    const email = within(d).getByLabelText('Email');
    expect(await within(d).findAllByText('This field is required.')).toHaveLength(2);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('This field is required.');
    expect(authApi.login).not.toHaveBeenCalled();
    await person.type(email, 'not-an-email');
    await person.click(submit);
    expect(await within(d).findByText('Enter a valid email address.')).toBeVisible();
  });

  it('submits trimmed values with Enter, shows pending state, then restores the returnTo deep link', async () => {
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    const authApi = createFakeAuthApi();
    authApi.login.mockReturnValue(gate.promise);
    const { user: person, router, client } = renderWithProviders(null, { routes, path: `/?auth=login&returnTo=${encodeURIComponent('/credentials?credentialId=abc#x')}`, session: { authApi } });
    client.setQueryData(queryKeys.dashboard(), 'leftover');
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), '  a@example.test ');
    await person.type(within(d).getByLabelText('Password'), 'x{Enter}');
    await waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1));
    expect(authApi.login.mock.calls[0]?.[0]).toEqual({ email: 'a@example.test', password: 'x' });
    const pending = within(d).getByRole('button', { name: 'Logging in…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(within(d).getByLabelText('Email')).toHaveAttribute('readonly');
    await act(async () => { gate.resolve(authResponseFor(testToken('n'), user)); await gate.promise; });
    await waitFor(() => expect(router.state.location.pathname).toBe('/credentials'));
    expect(await screen.findByRole('dialog', { name: 'Credential details' })).toBeVisible();
    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(credentialsApi.get).toHaveBeenCalledWith('abc', expect.anything());
    expect(router.state.location.hash).toBe('#x');
    expect(client.getQueryData(queryKeys.dashboard())).toBeUndefined();
  });

  it.each([['//evil.example'], ['https://evil.example'], ['/\\evil'], ['/admin']])('falls back to /dashboard for unsafe returnTo %s', async (bad) => {
    const { user: person, router } = renderWithProviders(null, { routes, path: `/?auth=login&returnTo=${encodeURIComponent(bad)}` });
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), 'a@example.test');
    await person.type(within(d).getByLabelText('Password'), 'x{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('shows the server message in an alert, keeps the dialog open and clears it when editing', async () => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValue(new ApiError('http', 401, 'Invalid email or password.', errorBody(401)));
    const { user: person, store } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), 'a@example.test');
    await person.type(within(d).getByLabelText('Password'), 'wrong{Enter}');
    expect(await within(d).findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(within(d).getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(store.getSnapshot().status).toBe('unauthenticated');
    await person.type(within(d).getByLabelText('Password'), 'x');
    await waitFor(() => expect(within(d).queryByText('Invalid email or password.')).not.toBeInTheDocument());
  });

  it('shows HTTP 429 without clearing inputs or starting automatic retries', async () => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValue(new ApiError('http', 429, 'Too many requests. Please try again later.', errorBody(429)));
    const { user: person, store } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), 'a@example.test');
    await person.type(within(d).getByLabelText('Password'), 'wrong{Enter}');
    expect(await within(d).findByRole('alert')).toHaveTextContent('Too many requests. Please try again later.');
    expect(within(d).getByLabelText('Email')).toHaveValue('a@example.test');
    expect(authApi.login).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().status).toBe('unauthenticated');
  });

  it('shows the network message when the server is unreachable', async () => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValue(new ApiError('network', 0, networkMessage));
    const { user: person } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), 'a@example.test');
    await person.type(within(d).getByLabelText('Password'), 'x{Enter}');
    expect(await within(d).findByText(networkMessage)).toBeVisible();
  });

  it('closing during a pending request abandons it: a late response never signs the user in', async () => {
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    const authApi = createFakeAuthApi();
    authApi.login.mockReturnValue(gate.promise);
    const { user: person, store, router } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await dialog('Log in');
    await person.type(within(d).getByLabelText('Email'), 'a@example.test');
    await person.type(within(d).getByLabelText('Password'), 'x{Enter}');
    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    await person.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await act(async () => { gate.resolve(authResponseFor(testToken('late'), user)); await gate.promise; });
    expect(store.getSnapshot().status).toBe('unauthenticated');
    expect(router.state.location.pathname).toBe('/');
  });

  it('closes with Escape and returns focus to the opener (F11/F12)', async () => {
    const { user: person, router } = renderWithProviders(null, { routes, path: '/' });
    const trigger = await screen.findByRole('button', { name: 'Log In' });
    await person.click(trigger);
    await dialog('Log in');
    expect(router.state.location.search).toBe('?auth=login');
    await person.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.search).toBe('');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Log In' })).toHaveFocus());
  });

  it('switches to sign-up and back', async () => {
    const { user: person, router } = open();
    const d = await dialog('Log in');
    await person.click(within(d).getByRole('button', { name: 'Sign up' }));
    expect(await dialog('Sign up')).toBeVisible();
    expect(router.state.location.search).toBe('?auth=register');
    await person.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log in' }));
    expect(await dialog('Log in')).toBeVisible();
  });
});

describe('sign-up dialog', () => {
  it('has name/email/new-password fields with correct autocomplete', async () => {
    open('/?auth=register');
    const d = await dialog('Sign up');
    expect(within(d).getByLabelText('Name')).toHaveAttribute('autocomplete', 'name');
    expect(within(d).getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(within(d).getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
    await waitFor(() => expect(within(d).getByLabelText('Name')).toHaveFocus());
  });

  it('validates backend limits and the 8-character minimum before sending', async () => {
    const { user: person, authApi } = open('/?auth=register');
    const d = await dialog('Sign up');
    await person.type(within(d).getByLabelText('Name'), 'Ada');
    await person.type(within(d).getByLabelText('Email'), 'ada@example.test');
    await person.type(within(d).getByLabelText('Password'), '1234567{Enter}');
    expect(await within(d).findByText('Password must be at least 8 characters.')).toBeVisible();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('registers, signs in and lands on /dashboard', async () => {
    const authApi = createFakeAuthApi();
    authApi.register.mockResolvedValue(authResponseFor(testToken('r'), user));
    const { user: person, router, store } = renderWithProviders(null, { routes, path: '/?auth=register', session: { authApi } });
    const d = await dialog('Sign up');
    await person.type(within(d).getByLabelText('Name'), ' Ada ');
    await person.type(within(d).getByLabelText('Email'), 'ada@example.test');
    await person.type(within(d).getByLabelText('Password'), '12345678{Enter}');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(authApi.register.mock.calls[0]?.[0]).toEqual({ name: 'Ada', email: 'ada@example.test', password: '12345678' });
    expect(store.getSnapshot().status).toBe('authenticated');
  });

  it('shows the duplicate-email message from the server as a banner, not a field error', async () => {
    const authApi = createFakeAuthApi();
    authApi.register.mockRejectedValue(new ApiError('http', 400, 'Email is already in use.', errorBody(400)));
    const { user: person } = renderWithProviders(null, { routes, path: '/?auth=register', session: { authApi } });
    const d = await dialog('Sign up');
    await person.type(within(d).getByLabelText('Name'), 'Ada');
    await person.type(within(d).getByLabelText('Email'), 'ada@example.test');
    await person.type(within(d).getByLabelText('Password'), '12345678{Enter}');
    expect(await within(d).findByRole('alert')).toHaveTextContent('Email is already in use.');
    expect(within(d).getByLabelText('Email')).not.toHaveAttribute('aria-invalid', 'true');
  });
});

// M09: these routing/auth tests now reach the real credential page.
beforeEach(() => {
  vi.spyOn(credentialsApi, 'list').mockResolvedValue([]);
  vi.spyOn(credentialsApi, 'get').mockResolvedValue(credentialFixture);
});
