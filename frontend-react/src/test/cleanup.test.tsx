import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppModal } from '../shared/ui/app-modal';
import { renderWithProviders } from './render-with-providers';

// This ordered pair verifies the teardown boundary between independent test roots.
describe.sequential('global overlay cleanup boundary', () => {
  let unmountFrameFinished = false;

  it('schedules real overlay reconciliation at root cleanup', async () => {
    const { unmount } = renderWithProviders(<AppModal open title="Cleanup boundary" onClose={() => undefined}><button>Action</button></AppModal>);
    expect(await screen.findByRole('dialog', { name: 'Cleanup boundary' })).toBeVisible();
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    // Enqueued after the actual provider cleanup frames; setup.ts must drain them before the next test.
    requestAnimationFrame(() => { unmountFrameFinished = true; });
    expect(unmountFrameFinished).toBe(false);
  });

  it('begins the next test after overlay frames and before setting a new scroll/inert baseline', async () => {
    expect(unmountFrameFinished).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.paddingRight).toBe('');
    expect(document.querySelector('[inert]')).toBeNull();
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '7px';
    const untouched = document.createElement('div');
    untouched.inert = true;
    document.body.append(untouched);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      expect(document.body.style.overflow).toBe('scroll');
      expect(document.body.style.paddingRight).toBe('7px');
      expect(untouched.inert).toBe(true);
    } finally {
      untouched.remove();
    }
  });
});
