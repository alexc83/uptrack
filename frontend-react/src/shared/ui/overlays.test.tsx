import { useRef, useState, StrictMode } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { AppModal } from './app-modal';
import { DrawerShell } from './drawer-shell';
import { ConfirmDialog } from './confirm-dialog';
import { renderWithProviders } from '../../test/render-with-providers';

function Harness({ empty = false, removeOpener = false }: { empty?: boolean; removeOpener?: boolean }) {
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const fallback = useRef<HTMLButtonElement>(null);
  return <><button ref={fallback}>Fallback</button>{(!drawer || !removeOpener) && <button onClick={() => setDrawer(true)}>Open drawer</button>}<button onClick={() => setModal(true)}>Open modal</button><button onClick={() => setConfirm(true)}>Open confirm</button>
    <DrawerShell open={drawer} onClose={() => setDrawer(false)} title="Example drawer" fallbackFocusRef={fallback}>{!empty && <><button onClick={() => setModal(true)}>Open nested modal</button><button>Last drawer action</button></>}</DrawerShell>
    <AppModal open={modal} onClose={() => setModal(false)} title="Example modal" description="Modal description" footer={<button onClick={() => setModal(false)}>Done</button>}><label htmlFor="example">Example input</label><input id="example" /></AppModal>
    <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => setConfirm(false)} title="Confirm example" description="No data changes" />
  </>;
}
it('contains drawer focus and restores opener after Escape in StrictMode', async () => {
  const { user } = renderWithProviders(<StrictMode><Harness /></StrictMode>);
  const trigger = screen.getByRole('button', { name: 'Open drawer' });
  await user.click(trigger);
  const first = screen.getByRole('button', { name: 'Close drawer' });
  await waitFor(() => expect(first).toHaveFocus());
  await user.tab({ shift: true });
  expect(screen.getByRole('button', { name: 'Last drawer action' })).toHaveFocus();
  await user.tab();
  expect(first).toHaveFocus();
  await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(document.body.style.overflow).toBe('');
  expect(document.querySelector('[inert]')).toBeNull();
});
it('closes only the top layer and returns focus through nested overlays', async () => {
  const { user } = renderWithProviders(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open drawer' });
  await user.click(trigger);
  const nested = screen.getByRole('button', { name: 'Open nested modal' });
  await user.click(nested);
  expect(await screen.findByRole('dialog', { name: 'Example modal' })).toBeVisible();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(nested).toHaveFocus());
  expect(screen.getByRole('dialog', { name: 'Example drawer' })).toBeVisible();
  await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(document.body.style.overflow).toBe('');
});
it('uses Flowbite modal dismissal and return focus for Escape, X and backdrop', async () => {
  const { user } = renderWithProviders(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Open modal' });
  for (const path of ['escape', 'close', 'backdrop']) {
    await user.click(trigger);
    await screen.findByRole('dialog', { name: 'Example modal' });
    await user.click(screen.getByRole('textbox'));
    expect(screen.getByRole('dialog')).toBeVisible();
    if (path === 'escape') await user.keyboard('{Escape}');
    else if (path === 'close') await user.click(screen.getByRole('button', { name: 'Close' }));
    else fireEvent.mouseDown(screen.getByTestId('modal-overlay'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  }
});
it('handles an empty drawer and a disconnected opener with supplied fallback', async () => {
  const { user } = renderWithProviders(<Harness empty removeOpener />);
  await user.click(screen.getByRole('button', { name: 'Open drawer' }));
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Fallback' })).toHaveFocus());
});
it('initially focuses Cancel in confirmation dialogs', async () => {
  const { user } = renderWithProviders(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open confirm' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
});

it('restores pre-existing scroll styles and inert state after modal cleanup', async () => {
  const untouched = document.createElement('div');
  untouched.inert = true;
  document.body.append(untouched);
  document.body.style.overflow = 'scroll';
  document.body.style.paddingRight = '7px';
  const { user } = renderWithProviders(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Open modal' }));
  await screen.findByRole('dialog', { name: 'Example modal' });
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('7px');
  });
  expect(untouched.inert).toBe(true);
  untouched.remove();
  document.body.style.paddingRight = '';
});
