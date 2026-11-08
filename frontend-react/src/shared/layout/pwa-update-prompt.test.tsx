import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PwaUpdatePrompt } from './pwa-update-prompt';
import { WorkGuardProvider } from '../../core/work-guard/work-guard-context';
import { WorkGuardRegistry } from '../../core/work-guard/work-guard';
import type { PwaUpdateHook } from '../../core/pwa/use-pwa-update';

function mockPwaHook(overrides?: Partial<PwaUpdateHook>): PwaUpdateHook {
  return {
    needRefresh: true,
    offlineReady: false,
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
    dismissUpdate: vi.fn(),
    ...overrides,
  };
}

describe('PwaUpdatePrompt', () => {
  it('does not render when needRefresh is false', () => {
    const hook = mockPwaHook({ needRefresh: false });
    const { container } = render(<PwaUpdatePrompt pwaHook={hook} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders prompt when an update is available', () => {
    const hook = mockPwaHook({ needRefresh: true });
    render(<PwaUpdatePrompt pwaHook={hook} />);

    expect(screen.getByRole('heading', { level: 3, name: 'A new version of UpTrack is available' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Update now' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Later' })).toBeVisible();
  });

  it('calls dismissUpdate when Later or Dismiss is clicked', async () => {
    const user = userEvent.setup();
    const hook = mockPwaHook();
    render(<PwaUpdatePrompt pwaHook={hook} />);

    await user.click(screen.getByRole('button', { name: 'Later' }));
    expect(hook.dismissUpdate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(hook.dismissUpdate).toHaveBeenCalledTimes(2);
  });

  it('immediately applies update when no forms are dirty or busy', async () => {
    const user = userEvent.setup();
    const hook = mockPwaHook();
    render(
      <WorkGuardProvider registry={new WorkGuardRegistry()}>
        <PwaUpdatePrompt pwaHook={hook} />
      </WorkGuardProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Update now' }));
    expect(hook.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('defers update and notifies user when an operation is in progress', async () => {
    const user = userEvent.setup();
    const hook = mockPwaHook();
    const registry = new WorkGuardRegistry();
    registry.register({
      id: 'active-upload',
      description: 'Certificate upload',
      isBusy: () => true,
    });

    render(
      <WorkGuardProvider registry={registry}>
        <PwaUpdatePrompt pwaHook={hook} />
      </WorkGuardProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Update now' }));

    expect(hook.updateServiceWorker).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 3, name: 'Update deferred' })).toBeVisible();
    expect(screen.getByText(/Certificate upload \(in progress\)/)).toBeVisible();

    // Dismiss notice
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('button', { name: 'Update now' })).toBeVisible();
  });

  it('warns about unsaved changes and lets user keep editing or discard and update', async () => {
    const user = userEvent.setup();
    const hook = mockPwaHook();
    const registry = new WorkGuardRegistry();
    registry.register({
      id: 'dirty-credential-form',
      description: 'Credential form',
      isDirty: () => true,
    });

    render(
      <WorkGuardProvider registry={registry}>
        <PwaUpdatePrompt pwaHook={hook} />
      </WorkGuardProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Update now' }));

    expect(hook.updateServiceWorker).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 3, name: 'Unsaved changes detected' })).toBeVisible();

    // Choose to keep editing
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(hook.updateServiceWorker).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Update now' })).toBeVisible();

    // Click again and choose discard
    await user.click(screen.getByRole('button', { name: 'Update now' }));
    await user.click(screen.getByRole('button', { name: 'Discard and update' }));
    expect(hook.updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
