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
          { path: '/credentials', lazy: () => import('../features/credentials/credentials-page').then(module => ({ Component: module.CredentialsPage })) },
          { path: '/ce-records', lazy: () => import('../features/ce-records/ce-records-page').then(module => ({ Component: module.CERecordsPage })) },
          { path: '/settings', lazy: () => import('../features/settings/settings-page').then(module => ({ Component: module.SettingsPage })) },
          { path: '/preview', lazy: () => import('./preview/shell-placeholder').then(module => ({ Component: module.ShellPlaceholder })) },
        ],
      },
      {
        path: '/credentials/:credentialId/ce-report',
        lazy: () => import('../features/ce-report/ce-report-page').then(module => ({ Component: module.CEReportPage })),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

export const router = createBrowserRouter(routes);
