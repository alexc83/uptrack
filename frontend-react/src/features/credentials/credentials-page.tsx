import { Button, TextInput } from 'flowbite-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CredentialFilters } from '../../lib/dto/credentials';
import { PageContainer } from '../../shared/layout/page-container';
import { PageHeader } from '../../shared/layout/page-header';
import { StateBlock } from '../../shared/ui/state-block';
import { CredentialCard } from './credential-card';
import { CredentialDetailDrawer } from './credential-detail-drawer';
import { AddCredentialAction } from './credential-form-dialog';
import { CredentialSessionBoundary } from './credential-session-boundary';
import { sortCredentials } from './credential-view';
import { useCredentials } from './use-credentials';

export function CredentialsPage() {
  return <CredentialSessionBoundary><CredentialsContent /></CredentialSessionBoundary>;
}
function CredentialsContent() {
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CredentialFilters['status']>();
  const [type, setType] = useState<CredentialFilters['type']>();
  const [selected, setSelected] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const query = useCredentials({ status, type, search });
  useEffect(() => { document.title = 'Credentials — UpTrack'; }, []);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(rawSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [rawSearch]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('credentialId');
    if (!id) return;
    setSelected(id);
    params.delete('credentialId');
    void navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);
  const credentials = query.data ? sortCredentials(query.data) : [];
  const filtered = Boolean(search || status || type);
  const retry = { label: query.isFetching ? 'Retrying…' : 'Retry', onClick: () => void query.refetch() };
  return <PageContainer>
    <PageHeader eyebrow="Credentials" title="Live credential tracking" description="Review real licenses and certifications from the API, filter the list, and open full credential details without leaving the page." actions={<><span role="status" className="inline-flex min-h-11 items-center rounded-full bg-ut-hover px-4">{credentials.length} credential{credentials.length === 1 ? '' : 's'}</span><AddCredentialAction /></>} />
    <section aria-label="Credential filters" className="space-y-4 rounded-2xl border border-ut-border bg-ut-surface p-4">
      <TextInput type="search" aria-label="Search credentials" placeholder="Search by credential name or organization..." value={rawSearch} onChange={event => setRawSearch(event.target.value)} />
      <div className="flex flex-wrap items-center gap-4">
        <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-2"><span className="text-sm text-ut-muted">Status:</span>{([[undefined, 'All'], ['ACTIVE', 'Active'], ['EXPIRING_SOON', 'Expiring Soon'], ['EXPIRED', 'Expired']] as const).map(([value, label]) => <Button key={label} size="sm" color={status === value ? 'blue' : 'alternative'} aria-pressed={status === value} onClick={() => setStatus(value)}>{label}</Button>)}</div>
        <div role="group" aria-label="Type" className="flex flex-wrap items-center gap-2"><span className="text-sm text-ut-muted">Type:</span>{([[undefined, 'All'], ['LICENSE', 'License'], ['CERTIFICATION', 'Certification']] as const).map(([value, label]) => <Button key={label} size="sm" color={type === value ? 'blue' : 'alternative'} aria-pressed={type === value} onClick={() => setType(value)}>{label}</Button>)}</div>
        {(filtered || rawSearch) && <Button color="alternative" size="sm" onClick={() => { setRawSearch(''); setSearch(''); setStatus(undefined); setType(undefined); }}>Clear</Button>}
      </div>
    </section>
    {query.data && query.isRefetchError && <StateBlock kind="error" title="Credentials may be out of date" message="We could not refresh credentials. Showing the last data loaded." action={retry} />}
    {!query.data ? query.isError ? <StateBlock kind="error" title="Credentials unavailable" message={query.error.message} action={retry} /> : <StateBlock kind="loading" message="Loading credentials…" /> : credentials.length ? <section aria-label="Credential list" className="grid grid-cols-2 gap-5 [@media(width<=1200px)]:grid-cols-1">{credentials.map(credential => <CredentialCard key={credential.id} credential={credential} onOpen={() => setSelected(credential.id)} />)}</section> : <StateBlock kind="empty" title={filtered ? 'No credentials match these filters' : 'No credentials yet'} message={filtered ? 'Try adjusting your search, status, or type filters to widen the results.' : 'Your live credential list will appear here once credentials are available for this account.'} />}
    {selected && <CredentialDetailDrawer key={selected} id={selected} onClose={() => setSelected(null)} />}
  </PageContainer>;
}
