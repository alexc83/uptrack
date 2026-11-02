import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { AppProviders } from '../app/providers';

export function renderWithProviders(element: ReactNode, options: { routes?: RouteObject[]; path?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(options.routes ?? [{ path: '*', element }], { initialEntries: [options.path ?? '/'] });
  return { user: userEvent.setup(), router, client, ...render(<AppProviders client={client}><RouterProvider router={router} /></AppProviders>) };
}
