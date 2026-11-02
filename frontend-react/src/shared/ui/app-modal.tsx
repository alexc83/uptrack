import { Modal, ModalBody, ModalFooter, ModalHeader } from 'flowbite-react';
import { useId, type ReactNode } from 'react';
import { useOverlayLayer, type FocusOptions } from './use-overlay-layer';

interface AppModalProps extends FocusOptions {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  error?: string;
  children: ReactNode;
  footer?: ReactNode;
}
export function AppModal({ open, onClose, title, description, error, children, footer, ...focus }: AppModalProps) {
  const descriptionId = useId();
  const { host, isTop } = useOverlayLayer(open, false, focus);
  return <Modal show={open} root={host} dismissible onClose={() => { if (isTop()) onClose(); }} initialFocus={focus.initialFocusRef} size="lg" aria-describedby={description ? descriptionId : undefined}>
    <ModalHeader as="h2">{title}</ModalHeader>
    <ModalBody>{description && <p id={descriptionId} className="mb-4 text-ut-muted">{description}</p>}{error && <p role="alert" className="mb-4 rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-[var(--ut-status-expired-text)]">{error}</p>}{children}</ModalBody>
    {footer && <ModalFooter>{footer}</ModalFooter>}
  </Modal>;
}
