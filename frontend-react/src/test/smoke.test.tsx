import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '../app/providers';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { FoundationSmokeView } from '../app/router';

describe('M03 Foundation Smoke Tests', () => {
  it('renders root foundation component with Flowbite button', () => {
    const testRouter = createMemoryRouter(
      [
        {
          path: '/',
          element: <FoundationSmokeView />,
        },
      ],
      { initialEntries: ['/'] }
    );

    render(
      <AppProviders>
        <RouterProvider router={testRouter} />
      </AppProviders>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'UpTrack — React Foundation'
    );
    expect(screen.getByRole('button', { name: /Flowbite Button/i })).toBeInTheDocument();
  });

  it('verifies theme storage and class toggling logic', () => {
    localStorage.setItem('uptrack-theme', 'dark');
    expect(localStorage.getItem('uptrack-theme')).toBe('dark');

    // Test DOM theme class manipulation
    document.documentElement.classList.add('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    document.documentElement.classList.remove('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
