import { StrictMode, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClient } from '../core/query/query-client';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { AppProviders } from '../app/providers';
import { authResponseFor, createTestSession, testToken, type TestSessionOptions } from './auth-test-utils';
import { user as fixtureUser } from './fixtures/api-fixtures';

interface RenderOptions {
  routes?: RouteObject[];
  path?: string;
  /** 'guest' (default): no token. 'authenticated': stored token and a successful /auth/me. Or explicit options. */
  session?: 'guest' | 'authenticated' | TestSessionOptions;
  /** Wrap in React.StrictMode to exercise double effects/remounts. */
  strict?: boolean;
}

export function renderWithProviders(element: ReactNode, options: RenderOptions = {}) {
  const client = createQueryClient();
  client.setDefaultOptions({ ...client.getDefaultOptions(), queries: { ...client.getDefaultOptions().queries, retry: false } });
  const sessionOptions: TestSessionOptions = options.session === 'authenticated' ? { token: testToken('auth') } : typeof options.session === 'object' ? options.session : {};
  const { store, authApi, storage } = createTestSession(client, sessionOptions);
  if (options.session === 'authenticated') authApi.me.mockResolvedValue(fixtureUser);
  if (!sessionOptions.authApi) authApi.login.mockImplementation(async () => authResponseFor(testToken('login')));
  const router = createMemoryRouter(options.routes ?? [{ path: '*', element }], { initialEntries: [options.path ?? '/'] });
  const tree = <AppProviders client={client} session={store}><RouterProvider router={router} /></AppProviders>;
  return { user: userEvent.setup(), router, client, store, authApi, storage, ...render(options.strict ? <StrictMode>{tree}</StrictMode> : tree) };
}
