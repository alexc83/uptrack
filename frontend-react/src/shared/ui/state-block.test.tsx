import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StateBlock } from './state-block';
import { renderWithProviders } from '../../test/render-with-providers';
it('announces loading and marks its container busy', () => {
  renderWithProviders(<StateBlock kind="loading" message="Loading examples" />);
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Loading examples');
  expect(screen.getByText('Loading examples').closest('section')).toHaveAttribute('aria-busy', 'true');
});
it('renders separate empty/no-match copy and invokes a retry callback', async () => {
  const retry = vi.fn();
  const { user } = renderWithProviders(<><StateBlock kind="empty" title="Nothing here yet" message="Add an item" /><StateBlock kind="empty" title="No matches" message="Adjust filters" /><StateBlock kind="error" title="Unavailable" message="Try again" action={{ label: 'Retry', onClick: retry }} /></>);
  expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeVisible();
  expect(screen.getByRole('heading', { name: 'No matches' })).toBeVisible();
  expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledOnce();
});
