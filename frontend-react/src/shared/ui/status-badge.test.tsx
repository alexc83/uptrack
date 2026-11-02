import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { StatusBadge } from './status-badge';
import { renderWithProviders } from '../../test/render-with-providers';
it('communicates every supplied status in text as well as color', () => {
  renderWithProviders(<><StatusBadge status="ACTIVE" /><StatusBadge status="EXPIRING_SOON" /><StatusBadge status="EXPIRED" /></>);
  for (const label of ['Active', 'Expiring Soon', 'Expired']) expect(screen.getByText(label)).toBeVisible();
});
