import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProgressBar } from './progress-bar';
import { renderWithProviders } from '../../test/render-with-providers';
it.each([[160, 100], [-20, 0], [NaN, 0], [60, 60]])('clamps %s to %s and labels the range', (value, expected) => {
  renderWithProviders(<ProgressBar value={value} label="Example progress" />);
  const bar = screen.getByRole('progressbar', { name: 'Example progress' });
  expect(bar).toHaveAttribute('aria-valuenow', String(expected));
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '100');
});
