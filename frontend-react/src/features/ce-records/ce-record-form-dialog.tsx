import { Button } from 'flowbite-react';
import { useRef, useState } from 'react';
import { AppModal } from '../../shared/ui/app-modal';
import { CERecordForm } from './ce-record-form';
import type { CERecordCredentialOption } from './ce-record-view';
import { useCERecordMutation } from './use-ce-record-mutation';

export function CERecordFormDialog({ credentialOptions, onClose }: { credentialOptions: CERecordCredentialOption[]; onClose: () => void }) {
  const mutation = useCERecordMutation();
  const firstField = useRef<HTMLInputElement>(null);
  // Overlay events read the synchronous operation lock rather than a pending render snapshot.
  const close = () => { if (!mutation.isBusy()) onClose(); };
  return <AppModal open title="Add CE record" description="Add a CE completion and link it to the credential it should count toward." onClose={close} initialFocusRef={firstField}>
    <CERecordForm firstFieldRef={firstField} pending={mutation.pending} error={mutation.error} credentialOptions={credentialOptions} showCredentialField onCancel={close} onSubmit={async request => { if (await mutation.run({ kind: 'create', request })) onClose(); }} />
  </AppModal>;
}

/** Add CE Record is only possible once at least one credential exists (Angular parity). */
export function AddCERecordAction({ credentialOptions }: { credentialOptions: CERecordCredentialOption[] }) {
  const [open, setOpen] = useState(false);
  const disabled = credentialOptions.length === 0;
  return <><Button color="blue" disabled={disabled} onClick={() => setOpen(true)}>Add CE Record</Button>{open && <CERecordFormDialog credentialOptions={credentialOptions} onClose={() => setOpen(false)} />}</>;
}
