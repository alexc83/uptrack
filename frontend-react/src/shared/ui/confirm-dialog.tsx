import { Button } from 'flowbite-react';
import { useRef } from 'react';
import { AppModal } from './app-modal';

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm' }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string }) {
  const cancel = useRef<HTMLButtonElement>(null);
  return <AppModal open={open} onClose={onClose} title={title} description={description} initialFocusRef={cancel} footer={<><Button ref={cancel} color="alternative" onClick={onClose}>Cancel</Button><Button color="blue" onClick={onConfirm}>{confirmLabel}</Button></>}><p className="text-sm text-ut-muted">Choose Cancel to return without making a change.</p></AppModal>;
}
