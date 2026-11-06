import { Button } from 'flowbite-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../core/api/api-error';
import { DrawerShell } from '../../shared/ui/drawer-shell';
import { StateBlock } from '../../shared/ui/state-block';
import { StatusBadge } from '../../shared/ui/status-badge';
import { CredentialProgress } from './credential-card';
import { CredentialForm } from './credential-form';
import { DeleteCredentialDialog } from './delete-credential-dialog';
import { credentialReportHref, credentialView, formatCredentialHours, formatShortDate } from './credential-view';
import { useCredential } from './use-credentials';
import { useCredentialMutation } from './use-credential-mutation';

export function CredentialDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useCredential(id);
  const mutation = useCredentialMutation();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const locked = useRef(false);
  const fallbackFocus = useRef<HTMLElement>(null);
  useEffect(() => { fallbackFocus.current = document.getElementById('main-content') ?? document.querySelector('h1'); }, []);
  const close = () => { if (!locked.current && !mutation.isBusy() && !deleting) onClose(); };
  const credential = query.data;
  const isNotFound = query.error instanceof ApiError ? query.error.status === 404 : (query.error as { status?: number } | null)?.status === 404;
  const view = credential ? credentialView(credential) : null;
  const records = credential ? [...credential.ceRecords].sort((a, b) => b.dateCompleted.localeCompare(a.dateCompleted)) : [];
  return <DrawerShell open title={editing ? 'Edit credential' : 'Credential details'} onClose={close} fallbackFocusRef={fallbackFocus}>
    {!credential && (query.isError ? (
      isNotFound ? (
        <StateBlock kind="error" title="Credential unavailable" message="This credential could not be found or is unavailable." action={{ label: 'Close', onClick: close }} />
      ) : (
        <StateBlock kind="error" title="Credential unavailable" message={query.error.message} action={{ label: 'Retry', onClick: () => void query.refetch() }} />
      )
    ) : <StateBlock kind="loading" message="Loading credential details…" />)}
    {credential && view && (editing ? <CredentialForm editing initialValue={credential} pending={mutation.pending} error={mutation.error} onCancel={() => { mutation.clearError(); setEditing(false); }} onSubmit={async request => { locked.current = true; try { if (await mutation.run({ kind: 'edit', id, request })) setEditing(false); } finally { locked.current = false; } }} /> : <div className="space-y-5 break-words">
      {query.isRefetchError && <StateBlock kind="error" title="Credential may be out of date" message="We could not refresh this credential. Showing the last data loaded." action={{ label: 'Retry', onClick: () => void query.refetch() }} />}
      <header><h3 className="text-2xl font-bold">{credential.name}</h3><p className="my-2 text-ut-muted">{credential.issuingOrganization}</p><div className="flex flex-wrap items-center gap-3"><span>{view.typeLabel}</span><StatusBadge status={credential.status} label={view.statusLabel} /></div></header>
      <dl className="grid grid-cols-2 gap-3 [@media(width<=640px)]:grid-cols-1">{[
        ['Expires', view.expiration], ['Renewal Cycle', `${credential.renewalCycleMonths} months`],
        ['Required CE Hours', credential.requiredCEHours > 0 ? `${credential.requiredCEHours} hours` : 'Not required'],
        ['Current Status', credential.status === 'EXPIRING_SOON' ? 'Expiring Soon' : credential.status === 'EXPIRED' ? 'Expired' : 'Active'],
      ].map(([label, value]) => <div key={label} className="rounded-xl bg-ut-hover p-4"><dt className="text-sm text-ut-muted">{label}</dt><dd className="font-semibold">{value}</dd></div>)}</dl>
      <section className="rounded-xl border border-ut-border p-4"><h3 className="mb-3 font-semibold">CE Progress</h3><CredentialProgress credential={credential} /></section>
      <section className="space-y-3 rounded-xl border border-ut-border p-4"><h3 className="font-semibold">CE Records ({records.length})</h3>{records.length ? <><p className="text-sm text-ut-muted">{credential.requiredCEHours > 0 ? 'Recent continuing education attached to this credential' : 'Continuing education tracking is not required for this credential'}</p><ul className="divide-y divide-ut-border">{records.map(record => <li key={record.id} className="py-3"><strong>{record.title}</strong><p className="text-sm text-ut-muted">{record.provider} · {formatShortDate(record.dateCompleted)}</p><p className="text-sm">{formatCredentialHours(record.hours)} hrs · {record.certificateUrl ? 'Certificate on file' : 'No certificate'}</p></li>)}</ul><p className="text-sm text-ut-muted">{records.length} record{records.length === 1 ? '' : 's'} · {formatCredentialHours(records.reduce((sum, record) => sum + record.hours, 0))} total hours</p></> : <div><strong>{credential.requiredCEHours > 0 ? 'No CE records yet' : 'No CE records required'}</strong><p className="text-sm text-ut-muted">{credential.requiredCEHours > 0 ? "Add a CE record to start building this credential's renewal history." : 'This credential does not require continuing education records for renewal.'}</p></div>}</section>
      <footer className="flex flex-wrap gap-3"><Button color="alternative" onClick={() => setEditing(true)}>Edit Credential</Button><Button color="red" onClick={() => setDeleting(true)}>Delete Credential</Button><Link className="inline-flex min-h-11 items-center text-ut-primary underline" to={credentialReportHref(id)}>Open CE Report</Link></footer>
    </div>)}
    {deleting && <DeleteCredentialDialog id={id} onClose={() => setDeleting(false)} onDeleted={onClose} />}
  </DrawerShell>;
}
