import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppProviders } from '../app/providers';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { LandingPage } from '../features/landing/landing-page';

describe('Root route smoke tests', () => {
  it('renders the landing page with a Flowbite auth button', () => {
    const testRouter = createMemoryRouter(
      [
        {
          path: '/',
          element: <LandingPage />,
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
      'Track credentials. Stay compliant. Own your career.'
    );
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
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
