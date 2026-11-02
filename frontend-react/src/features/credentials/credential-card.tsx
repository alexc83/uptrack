import { Link } from 'react-router-dom';
import type { CredentialResponse } from '../../lib/dto/credentials';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { credentialReportHref, credentialView } from './credential-view';

export function CredentialProgress({ credential }: { credential: CredentialResponse }) {
  const view = credentialView(credential);
  return <section className="space-y-3" aria-label={`CE progress for ${credential.name}`}><div className="flex flex-wrap justify-between gap-2 text-sm"><span>{view.hoursLabel}</span><strong>{view.progressLabel}</strong></div><ProgressBar value={view.percent} label={`CE completion for ${credential.name}`} tone={view.tone} /></section>;
}
export function CredentialCard({ credential, onOpen }: { credential: CredentialResponse; onOpen: () => void }) {
  const view = credentialView(credential);
  return <article className="relative min-w-0 rounded-2xl border border-ut-border bg-ut-surface p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 break-words"><h2 className="text-xl font-semibold"><button type="button" className="min-h-11 text-left text-ut-text underline-offset-4 after:absolute after:inset-0 after:rounded-2xl hover:underline" onClick={onOpen}>{credential.name}</button></h2><p className="text-ut-muted">{credential.issuingOrganization}</p></div><StatusBadge status={credential.status} label={view.statusLabel} /></div>
    <p className="mb-4 text-sm text-ut-muted">{view.typeLabel}</p>
    <dl className="mb-5 grid grid-cols-2 gap-3 [@media(width<=768px)]:grid-cols-1"><div className="rounded-xl bg-ut-hover p-4"><dt className="text-sm text-ut-muted">Expires</dt><dd className="font-semibold">{view.expiration}</dd></div><div className="rounded-xl bg-ut-hover p-4"><dt className="text-sm text-ut-muted">Renewal Cycle</dt><dd className="font-semibold">{credential.renewalCycleMonths} months</dd></div></dl>
    <CredentialProgress credential={credential} />
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link className="relative z-10 inline-flex min-h-11 items-center rounded-lg px-3 text-ut-primary underline" to={credentialReportHref(credential.id)}>Open CE Report<span className="sr-only"> for {credential.name}</span></Link><span aria-hidden="true" className="text-sm text-ut-muted">Click card for details ↗</span></div>
  </article>;
}
