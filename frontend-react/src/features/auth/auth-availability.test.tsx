import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { ApiError, networkMessage, recoveredMessage, slowRequestMessage, timeoutMessage } from '../../core/api/api-error';
import { checkBackendReady } from '../../core/api/health-api';
import { createFakeAuthApi, authResponseFor, testToken } from '../../test/auth-test-utils';
import { deferred, errorBody, user } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../core/api/health-api', () => ({ checkBackendReady: vi.fn() }));
const ready = vi.mocked(checkBackendReady);

// Real time keeps advancing (user-event relies on it); only timers are controlled by the fake clock.
beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); ready.mockReset().mockResolvedValue(false); });
afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
async function submitLogin(person: ReturnType<typeof renderWithProviders>['user']) {
  const d = await screen.findByRole('dialog', { name: 'Log in' });
  await person.type(within(d).getByLabelText('Email'), 'a@example.test');
  await person.type(within(d).getByLabelText('Password'), 'secret12{Enter}');
  return d;
}

describe('login during slow or unavailable service', () => {
  it('shows the existing pending state at once, a polite slow notice at 10s, and keeps one request', async () => {
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    const authApi = createFakeAuthApi();
    authApi.login.mockReturnValue(gate.promise);
    const { user: person, router } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await submitLogin(person);
    expect(within(d).getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    await advance(9_000);
    expect(screen.queryByText(slowRequestMessage)).not.toBeInTheDocument();
    await advance(1_500);
    expect(await within(d).findByText(slowRequestMessage)).toBeVisible();
    expect(screen.getByText(slowRequestMessage).closest('[aria-live="polite"]')).not.toBeNull();
    expect(within(d).getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    await act(async () => { gate.resolve(authResponseFor(testToken('ok'), user)); await gate.promise; });
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(authApi.login).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['timeout', new ApiError('timeout', 0, timeoutMessage), timeoutMessage],
    ['network failure', new ApiError('network', 0, networkMessage), networkMessage],
    ['502', new ApiError('http', 502, networkMessage, '<html>Bad gateway</html>'), networkMessage],
    ['503', new ApiError('http', 503, networkMessage, ''), networkMessage],
    ['504', new ApiError('http', 504, networkMessage, 'gateway timeout'), networkMessage],
  ])('%s ends the attempt with an alert, re-enables the form as "Try again" and never resubmits', async (_label, error, message) => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValue(error);
    const { user: person, store } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await submitLogin(person);
    expect(await within(d).findByRole('alert')).toHaveTextContent(message);
    const retry = within(d).getByRole('button', { name: 'Try again' });
    expect(retry).toBeEnabled();
    expect(retry).not.toHaveAttribute('aria-busy', 'true');
    expect(within(d).getByLabelText('Email')).toHaveValue('a@example.test');
    expect(within(d).getByLabelText('Password')).not.toHaveAttribute('readonly');
    await advance(180_000);
    expect(authApi.login).toHaveBeenCalledTimes(1); // no automatic resubmission, ever
    expect(store.getSnapshot().status).toBe('unauthenticated');
  });

  it('keeps specific errors specific: wrong password is not reported as an outage', async () => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValue(new ApiError('http', 401, 'Invalid email or password.', errorBody(401)));
    const { user: person } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await submitLogin(person);
    expect(await within(d).findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(within(d).getByRole('button', { name: 'Log in' })).toBeEnabled();
    expect(within(d).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await advance(60_000);
    expect(ready).not.toHaveBeenCalled(); // no recovery polling for non-outage failures
  });

  it('survives a 3 minute outage: polls gently, announces recovery, and only logs in when the user retries', async () => {
    const authApi = createFakeAuthApi();
    authApi.login.mockRejectedValueOnce(new ApiError('http', 503, networkMessage, ''));
    const { user: person, router } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await submitLogin(person);
    expect(await within(d).findByRole('alert')).toHaveTextContent(networkMessage);
    await advance(180_000);
    expect(ready.mock.calls.length).toBeLessThanOrEqual(13);
    expect(within(d).queryByText(new RegExp(recoveredMessage))).not.toBeInTheDocument();
    ready.mockResolvedValue(true);
    await advance(15_000);
    expect(await within(d).findByText(`${recoveredMessage} You can try logging in.`)).toBeVisible();
    expect(within(d).queryByRole('alert')).not.toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledTimes(1); // recovery alone never resends credentials
    const polled = ready.mock.calls.length;
    await advance(60_000);
    expect(ready).toHaveBeenCalledTimes(polled); // polling stopped
    authApi.login.mockResolvedValue(authResponseFor(testToken('ok'), user));
    await person.click(within(d).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(authApi.login).toHaveBeenCalledTimes(2);
  });

  it('closing the dialog stops the slow-notice timer, polling and any late sign-in', async () => {
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    const authApi = createFakeAuthApi();
    authApi.login.mockReturnValue(gate.promise);
    const { user: person, store } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    await submitLogin(person);
    await person.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await advance(60_000);
    expect(screen.queryByText(slowRequestMessage)).not.toBeInTheDocument();
    await act(async () => { gate.resolve(authResponseFor(testToken('late'), user)); await gate.promise; });
    expect(store.getSnapshot().status).toBe('unauthenticated');
    expect(ready).not.toHaveBeenCalled();
  });

  it('a timed-out attempt cannot establish a session if its response arrives later', async () => {
    const gate = deferred<ReturnType<typeof authResponseFor>>();
    const authApi = createFakeAuthApi();
    authApi.login.mockImplementationOnce(() => gate.promise.then(() => { throw new ApiError('timeout', 0, timeoutMessage); }));
    const { user: person, store } = renderWithProviders(null, { routes, path: '/?auth=login', session: { authApi } });
    const d = await submitLogin(person);
    await act(async () => { gate.resolve(authResponseFor(testToken('late'), user)); await gate.promise; });
    expect(await within(d).findByRole('alert')).toHaveTextContent(timeoutMessage);
    expect(store.getSnapshot().status).toBe('unauthenticated');
    expect(store.getToken()).toBeNull();
  });
});

describe('registration during an outage', () => {
  it('reports unavailability, offers Try again and announces recovery for sign up', async () => {
    const authApi = createFakeAuthApi();
    authApi.register.mockRejectedValueOnce(new ApiError('network', 0, networkMessage));
    const { user: person } = renderWithProviders(null, { routes, path: '/?auth=register', session: { authApi } });
    const d = await screen.findByRole('dialog', { name: 'Sign up' });
    await person.type(within(d).getByLabelText('Name'), 'Pat Example');
    await person.type(within(d).getByLabelText('Email'), 'pat@example.test');
    await person.type(within(d).getByLabelText('Password'), 'secret12{Enter}');
    expect(await within(d).findByRole('alert')).toHaveTextContent(networkMessage);
    expect(within(d).getByRole('button', { name: 'Try again' })).toBeEnabled();
    ready.mockResolvedValue(true);
    await advance(15_000);
    expect(await within(d).findByText(`${recoveredMessage} You can try signing up.`)).toBeVisible();
    expect(authApi.register).toHaveBeenCalledTimes(1);
  });
});
