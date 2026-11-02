import { Button } from 'flowbite-react';
import { useRef, useState } from 'react';
import { AppModal } from '../../shared/ui/app-modal';
import { CredentialForm } from './credential-form';
import { CredentialSessionBoundary } from './credential-session-boundary';
import { useCredentialMutation } from './use-credential-mutation';

export function CredentialFormDialog({ onClose }: { onClose: () => void }) {
  const mutation = useCredentialMutation();
  const firstField = useRef<HTMLInputElement>(null);
  // Overlay events read the synchronous operation lock rather than a pending render snapshot.
  const close = () => { if (!mutation.isBusy()) onClose(); };
  return <AppModal open title="Add credential" description="Create a live credential record without leaving your current page." onClose={close} initialFocusRef={firstField}>
    <CredentialForm firstFieldRef={firstField} pending={mutation.pending} error={mutation.error} onCancel={close} onSubmit={async request => { if (await mutation.run({ kind: 'create', request })) onClose(); }} />
  </AppModal>;
}

/** Self-contained reusable action: no credential-list read needed on the dashboard. */
export function AddCredentialAction() {
  return <CredentialSessionBoundary><AddCredentialControl /></CredentialSessionBoundary>;
}
function AddCredentialControl() {
  const [open, setOpen] = useState(false);
  return <><Button color="blue" onClick={() => setOpen(true)}>Add Credential</Button>{open && <CredentialFormDialog onClose={() => setOpen(false)} />}</>;
}
