import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '../shared/layout/app-shell';
import { GuestOnly, RequireAuth } from '../core/auth/route-guards';
import { RedirectPreservingSearch } from './redirect-preserving-search';
import { LandingPage } from '../features/landing/landing-page';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <GuestOnly><LandingPage /></GuestOnly>,
  },
  ...['app', 'app/dashboard', 'app/credentials', 'app/ce-records'].map(path => ({
    path: `/${path}`,
    element: <RedirectPreservingSearch to={path === 'app' ? '/dashboard' : `/${path.slice(4)}`} />,
  })),
  {
    element: <RequireAuth />,
    hydrateFallbackElement: <p role="status">Loading migration preview</p>,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', lazy: () => import('../features/dashboard/dashboard-page').then(module => ({ Component: module.DashboardPage })) },
          ...['credentials', 'ce-records', 'settings'].map(path => ({
            path: `/${path}`,
            lazy: () => import('./preview/shell-placeholder').then(module => ({ Component: module.ShellPlaceholder })),
          })),
        ],
      },
      {
        path: '/credentials/:credentialId/ce-report',
        lazy: () => import('./preview/report-placeholder').then(module => ({ Component: module.ReportPlaceholder })),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

export const router = createBrowserRouter(routes);
