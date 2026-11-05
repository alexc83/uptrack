import { safeHttpUrl } from '../../lib/safe-url';
import { Button } from 'flowbite-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrawerShell } from '../../shared/ui/drawer-shell';
import { StateBlock } from '../../shared/ui/state-block';
import { CERecordForm } from './ce-record-form';
import { ceRecordFormValues } from './ce-record-form-schema';
import type { CERecordCredentialOption } from './ce-record-view';
import { buildCERecordDetailView } from './ce-record-view';
import { DeleteCERecordDialog } from './delete-ce-record-dialog';
import { ceRecordsApi } from '../../core/api/ce-records-api';
import { ApiError } from '../../core/api/api-error';
import { useCERecord } from './use-ce-records';
import { useCERecordMutation } from './use-ce-record-mutation';

export function CERecordDetailDrawer({ id, context, onClose }: { id: string; context: CERecordCredentialOption; onClose: () => void }) {
  const query = useCERecord(id);
  const mutation = useCERecordMutation();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [viewError, setViewError] = useState<string>();
  const locked = useRef(false);
  const fallbackFocus = useRef<HTMLElement>(null);
  useEffect(() => { fallbackFocus.current = document.getElementById('main-content') ?? document.querySelector('h1'); }, []);
  const close = () => { if (!locked.current && !mutation.isBusy() && !deleting && !removing) onClose(); };
  const record = query.data;
  const view = record ? buildCERecordDetailView(record, context) : null;
  // Phase 3 (#23): managed certificates are viewed via an on-demand short-lived URL
  // (bearer JWT cannot ride a plain anchor); external/legacy links keep the anchor.
  // Popup is opened synchronously on the click to preserve user activation, then navigated
  // to the fresh URL; on API failure the placeholder tab is closed and an inline error shows.
  async function viewCertificate() {
    if (!view?.hasManagedCertificate || view.certificateUrl || viewing) return;
    setViewing(true);
    setViewError(undefined);
    // Note: the initial open intentionally omits noopener so we get a window handle to navigate;
    // opener is severed immediately after navigation for cross-origin isolation.
    const popup = window.open('', '_blank');
    let delivery;
    try {
      delivery = await ceRecordsApi.getCertificateUrl(id);
    } catch (cause) {
      popup?.close();
      setViewError(cause instanceof ApiError ? cause.message : 'We could not open that certificate right now. Please try again.');
      setViewing(false);
      return;
    }
    if (popup && !popup.closed) {
      popup.location.href = delivery.url;
      popup.opener = null;
    } else {
      const fallback = window.open(delivery.url, '_blank', 'noopener,noreferrer');
      if (!fallback) setViewError('Please allow pop-ups for this site to view the certificate.');
    }
    setViewing(false);
  }
  async function removeCertificate() {
    if (!(record?.certificateUrl || record?.certificateAssetId) || removing) return;
    setRemoving(true);
    try {
      await mutation.run({
        kind: 'edit',
        id,
        request: { title: record.title, provider: record.provider, hours: record.hours, dateCompleted: record.dateCompleted, credentialId: context.credentialId, certificateUrl: null, certificatePublicId: null, certificateResourceType: null, certificateOriginalFilename: null, certificateAssetId: null },
      });
    } finally {
      setRemoving(false);
    }
  }
  return <DrawerShell open title={editing ? 'Edit CE record' : 'CE record details'} onClose={close} fallbackFocusRef={fallbackFocus}>
    {!record && (query.isError ? <StateBlock kind="error" title="CE record unavailable" message={query.error.message} action={{ label: 'Retry', onClick: () => void query.refetch() }} /> : <StateBlock kind="loading" message="Loading CE record…" />)}
    {record && view && (editing ? <div className="space-y-5">
      <p className="text-sm text-ut-muted">Update completion details without leaving this drawer.</p>
      <CERecordForm editing initialValue={ceRecordFormValues(record, context.credentialId)} pending={mutation.pending} error={mutation.error} onCancel={() => { mutation.clearError(); setEditing(false); }} onSubmit={async request => { locked.current = true; try { if (await mutation.run({ kind: 'edit', id, request })) setEditing(false); } finally { locked.current = false; } }} />
    </div> : <div className="space-y-5 break-words">
      {query.isRefetchError && <StateBlock kind="error" title="CE record may be out of date" message="We could not refresh this record. Showing the last data loaded." action={{ label: 'Retry', onClick: () => void query.refetch() }} />}
      {mutation.error && <p role="alert" className="rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-sm text-[var(--ut-status-expired-text)]">{mutation.error}</p>}
      <header><h3 className="text-2xl font-bold">{view.title}</h3><p className="my-2 text-ut-muted">{view.provider} · {view.completedDateLabel}</p><span className="inline-flex items-center rounded-full bg-ut-hover px-3 py-1 text-sm font-semibold">{view.hoursLabel}</span></header>
      <dl className="grid grid-cols-2 gap-3 [@media(width<=640px)]:grid-cols-1">{view.metadata.map(field => <div key={field.label} className="rounded-xl bg-ut-hover p-4"><dt className="text-sm text-ut-muted">{field.label}</dt><dd className="font-semibold">{field.value}</dd></div>)}</dl>
      <section className="rounded-xl border border-ut-border p-4"><h3 className="font-semibold">Associated Credential</h3><p className="mb-3 text-sm text-ut-muted">This CE entry counts toward the credential below.</p><button type="button" className="flex w-full items-center justify-between gap-3 rounded-lg bg-ut-hover p-3 text-left hover:bg-ut-border" onClick={() => { onClose(); void navigate(`/credentials?credentialId=${encodeURIComponent(view.credentialId)}`); }}><span className="min-w-0"><strong className="block truncate">{view.credentialName}</strong><span className="text-sm text-ut-muted">{view.credentialOrganization}</span></span><span aria-hidden="true">→</span></button></section>
      <section className="rounded-xl border border-ut-border p-4"><h3 className="font-semibold">Certificate</h3><p className="mb-3 text-sm text-ut-muted">Supporting documentation for this CE completion.</p>
        {view.hasManagedCertificate && !view.certificateUrl ? <div className="flex flex-wrap items-center gap-3"><Button color="alternative" size="sm" disabled={viewing} onClick={() => { void viewCertificate(); }}>{viewing ? 'Opening…' : view.certificateLabel}</Button><Button color="red" size="sm" disabled={removing} onClick={() => { void removeCertificate(); }}>{removing ? 'Removing…' : 'Remove Certificate'}</Button></div>
          : view.certificateUrl ? <div className="flex flex-wrap items-center gap-3">{safeHttpUrl(view.certificateUrl) ? <a className="inline-flex min-h-11 items-center text-ut-primary underline" href={safeHttpUrl(view.certificateUrl) ?? undefined} target="_blank" rel="noreferrer">{view.certificateLabel}</a> : <span className="inline-flex min-h-11 items-center text-ut-muted">Certificate link unavailable</span>}<Button color="red" size="sm" disabled={removing} onClick={() => { void removeCertificate(); }}>{removing ? 'Removing…' : 'Remove Certificate'}</Button></div>
          : <div><strong>No certificate uploaded</strong><p className="text-sm text-ut-muted">Add a file later to keep this record audit-ready.</p></div>}
        {viewError && <p role="alert" className="mt-2 rounded-lg bg-[var(--ut-status-expired-bg)] p-3 text-sm text-[var(--ut-status-expired-text)]">{viewError}</p>}
      </section>
      <footer className="flex flex-wrap gap-3"><Button color="blue" onClick={() => { mutation.clearError(); setEditing(true); }}>Edit CE Record</Button><Button color="red" onClick={() => { mutation.clearError(); setDeleting(true); }}>Delete CE Record</Button></footer>
    </div>)}
    {deleting && <DeleteCERecordDialog id={id} credentialId={context.credentialId} onClose={() => setDeleting(false)} onDeleted={onClose} />}
  </DrawerShell>;
}
