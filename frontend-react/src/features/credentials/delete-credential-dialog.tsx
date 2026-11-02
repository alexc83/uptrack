import { Button } from 'flowbite-react';
import { useRef } from 'react';
import { AppModal } from '../../shared/ui/app-modal';
import { useCredentialMutation } from './use-credential-mutation';

export function DeleteCredentialDialog({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const mutation = useCredentialMutation();
  const cancel = useRef<HTMLButtonElement>(null);
  const close = () => { if (!mutation.isBusy()) onClose(); };
  return <AppModal open title="Delete credential?" description="This will remove the credential and any linked CE records from your account." error={mutation.error} onClose={close} initialFocusRef={cancel} footer={<><Button ref={cancel} color="alternative" disabled={mutation.pending} onClick={close}>Cancel</Button><Button color="red" disabled={mutation.pending} onClick={() => { void mutation.run({ kind: 'delete', id }).then(ok => { if (ok) onDeleted(); }); }}>{mutation.pending ? 'Deleting…' : 'Delete Credential'}</Button></>}><p className="text-sm text-ut-muted">Choose Cancel to keep this credential and its linked records.</p></AppModal>;
}
