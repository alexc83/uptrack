import { useRef, useState } from 'react';
import { Button, Card, Checkbox, FileInput, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Textarea, TextInput } from 'flowbite-react';
import { AppModal } from '../../shared/ui/app-modal';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { DrawerShell } from '../../shared/ui/drawer-shell';
import { FormField } from '../../shared/ui/form-field';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { StateBlock } from '../../shared/ui/state-block';

export function SharedUiPreview() {
  const [drawer, setDrawer] = useState<'detail' | 'empty' | null>(null);
  const [modal, setModal] = useState<'standalone' | 'nested' | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState('No preview actions taken.');
  const [showError, setShowError] = useState(false);
  const modalInput = useRef<HTMLInputElement>(null);
  return <section aria-label="Shared UI preview" className="flex flex-col gap-6">
    <div><h2 className="text-xl font-semibold">Shared UI preview</h2><p className="mt-1 text-sm text-ut-muted">Development-only presentation examples. These controls do not save data or contact a server.</p></div>
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <Card><h3 className="text-lg font-semibold">Cards, status, and progress</h3><div className="flex flex-wrap gap-2"><StatusBadge status="ACTIVE" /><StatusBadge status="EXPIRING_SOON" /><StatusBadge status="EXPIRED" /></div><ProgressBar value={60} label="Example progress" /><div className="flex flex-wrap gap-3"><Button color="blue" onClick={() => setMessage('Primary preview action selected.')}>Primary action</Button><Button color="alternative" onClick={() => setMessage('Secondary preview action selected.')}>Secondary action</Button><Button color="blue" disabled>Unavailable</Button></div></Card>
      <Card><h3 className="text-lg font-semibold">Modal and drawer interactions</h3><div className="flex flex-wrap gap-3"><Button color="blue" onClick={() => setModal('standalone')}>Open modal</Button><Button color="alternative" onClick={() => setDrawer('detail')}>Open drawer</Button><Button color="alternative" onClick={() => setDrawer('empty')}>Open empty drawer</Button><Button color="alternative" onClick={() => setConfirm(true)}>Open confirmation</Button></div><p role="status" className="text-sm text-ut-muted">{message}</p></Card>
    </div>
    <Card><h3 className="text-lg font-semibold">Form presentation</h3><div className="grid gap-5 lg:grid-cols-2">
      <FormField label="Example text" hint="Presentation only; no validation schema." error={showError ? 'Example inline error.' : undefined}>{attrs => <TextInput {...attrs} placeholder="Enter preview text" />}</FormField>
      <FormField label="Example selection">{attrs => <Select {...attrs}><option>First option</option><option>Second option</option></Select>}</FormField>
      <FormField label="Example notes">{attrs => <Textarea {...attrs} rows={3} />}</FormField>
      <FormField label="Example attachment" hint="Selecting a file does not upload it.">{attrs => <FileInput {...attrs} />}</FormField>
      <label htmlFor="preview-error" className="flex min-h-11 items-center gap-3"><Checkbox id="preview-error" checked={showError} onChange={event => setShowError(event.target.checked)} />Show example error</label>
    </div></Card>
    <StateBlock kind="loading" message="Loading preview content" />
    <StateBlock kind="empty" title="Nothing here yet" message="Example of an empty collection." action={{ label: 'Example empty action', onClick: () => setMessage('Empty action selected.') }} />
    <StateBlock kind="empty" title="No matches" message="Example of a filtered collection with no results." />
    <StateBlock kind="error" title="Preview unavailable" message="Example error presentation. No request has failed." action={{ label: 'Retry preview', onClick: () => setMessage('Retry callback invoked without a network request.') }} />
    <Card><h3 className="text-lg font-semibold">Table convention</h3><p className="text-sm text-ut-muted">Use labelled headers and explicit keyboard actions. Feature-specific responsive cards belong to later milestones.</p><Table aria-label="Presentation example"><TableHead><TableRow><TableHeadCell>Example</TableHeadCell><TableHeadCell>Action</TableHeadCell></TableRow></TableHead><TableBody><TableRow><TableCell>Generic preview item</TableCell><TableCell><Button color="alternative" onClick={() => setDrawer('detail')}>View example</Button></TableCell></TableRow></TableBody></Table></Card>
    <DrawerShell open={drawer !== null} onClose={() => setDrawer(null)} title={drawer === 'empty' ? 'Empty drawer preview' : 'Drawer preview'}>{drawer === 'detail' && <div className="space-y-5"><p className="text-ut-muted">Generic detail presentation. Open a modal to verify nested focus and dismissal.</p><StatusBadge status="ACTIVE" label="Presentation example" /><Button color="blue" onClick={() => setModal('nested')}>Open nested modal</Button><Button color="alternative" onClick={() => setDrawer(null)}>Close panel</Button></div>}</DrawerShell>
    <AppModal open={modal !== null} onClose={() => setModal(null)} title={modal === 'nested' ? 'Nested modal preview' : 'Modal preview'} description="Generic presentation dialog. Nothing is submitted." initialFocusRef={modalInput} error={showError ? 'Example server-error region; the dialog stays open.' : undefined} footer={<Button color="alternative" onClick={() => setModal(null)}>Close modal</Button>}><FormField label="Modal example field">{attrs => <TextInput ref={modalInput} {...attrs} />}</FormField></AppModal>
    <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { setConfirm(false); setMessage('Preview confirmed. No data changed.'); }} title="Confirm preview action?" description="This demonstration does not change application data." />
  </section>;
}
