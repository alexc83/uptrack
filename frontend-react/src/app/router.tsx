import { useEffect } from 'react';
import { createBrowserRouter, Navigate, Link, type RouteObject } from 'react-router-dom';
import { Button } from 'flowbite-react';
import { AppShell } from '../shared/layout/app-shell';

export function FoundationSmokeView() {
  useEffect(() => { document.title = 'UpTrack — Credential & CE Tracking'; }, []);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center ut-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--ut-primary)]">
        UpTrack — React Foundation
      </h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + Flowbite React
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button color="blue" data-testid="flowbite-button">
          Flowbite Button
        </Button>
      </div>
      <Link to="/dashboard" className="mt-5 inline-flex min-h-11 items-center rounded-lg px-3 text-ut-primary underline">Open migration shell preview</Link>
    </main>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <FoundationSmokeView />,
  },
  ...['app', 'app/dashboard', 'app/credentials', 'app/ce-records'].map(path => ({
    path: `/${path}`,
    element: <Navigate to={path === 'app' ? '/dashboard' : `/${path.slice(4)}`} replace />,
  })),
  {
    element: <AppShell />,
    hydrateFallbackElement: <p role="status">Loading migration preview</p>,
    children: ['dashboard', 'credentials', 'ce-records', 'settings'].map(path => ({
      path: `/${path}`,
      lazy: () => import('./preview/shell-placeholder').then(module => ({ Component: module.ShellPlaceholder })),
    })),
  },
  {
    path: '/credentials/:credentialId/ce-report',
    hydrateFallbackElement: <p role="status">Loading report preview</p>,
    lazy: () => import('./preview/report-placeholder').then(module => ({ Component: module.ReportPlaceholder })),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

export const router = createBrowserRouter(routes);
