import { Button } from 'flowbite-react';
import { useRef } from 'react';
import { AppModal } from '../../shared/ui/app-modal';
import { useCERecordMutation } from './use-ce-record-mutation';

export function DeleteCERecordDialog({ id, credentialId, onClose, onDeleted }: { id: string; credentialId: string; onClose: () => void; onDeleted: () => void }) {
  const mutation = useCERecordMutation();
  const cancel = useRef<HTMLButtonElement>(null);
  const close = () => { if (!mutation.isBusy()) onClose(); };
  return <AppModal open title="Delete CE record?" description="This CE entry will be removed and the linked credential totals will refresh immediately." error={mutation.error} onClose={close} initialFocusRef={cancel} footer={<><Button ref={cancel} color="alternative" disabled={mutation.pending} onClick={close}>Cancel</Button><Button color="red" disabled={mutation.pending} onClick={() => { void mutation.run({ kind: 'delete', id, credentialId }).then(ok => { if (ok) onDeleted(); }); }}>{mutation.pending ? 'Deleting…' : 'Delete CE Record'}</Button></>}><p className="text-sm text-ut-muted">Choose Cancel to keep this CE record.</p></AppModal>;
}
