import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Button } from 'flowbite-react';

export function FoundationSmokeView() {
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
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <FoundationSmokeView />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
