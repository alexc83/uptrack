import { Button, Select, TextInput } from 'flowbite-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../shared/layout/page-container';
import { PageHeader } from '../../shared/layout/page-header';
import { StateBlock } from '../../shared/ui/state-block';
import { AddCERecordAction } from './ce-record-form-dialog';
import { CERecordDetailDrawer } from './ce-record-detail-drawer';
import { CERecordSessionBoundary } from './ce-record-session-boundary';
import { buildCERecordCredentialOptions, filterCERecords, flattenCERecords, paginateCERecords, summarizeCERecords, type CERecordListItem } from './ce-record-view';
import { useCredentials } from '../credentials/use-credentials';

export function CERecordsPage() {
  return <CERecordSessionBoundary><CERecordsContent /></CERecordSessionBoundary>;
}

function CERecordsContent() {
  const [rawSearch, setRawSearch] = useState('');
  const [search, setSearch] = useState('');
  const [credentialFilter, setCredentialFilter] = useState('');
  const [certificateFilter, setCertificateFilter] = useState<'all' | 'on-file' | 'missing'>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CERecordListItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const query = useCredentials({});
  useEffect(() => { document.title = 'CE Records — UpTrack'; }, []);
  useEffect(() => {
    const next = rawSearch.trim();
    if (next === search) return; // nothing to apply (e.g. on mount): must not send the user back to the first page
    const timer = setTimeout(() => { setSearch(next); setPage(0); }, 250);
    return () => clearTimeout(timer);
  }, [rawSearch, search]);

  const credentialOptions = useMemo(() => buildCERecordCredentialOptions(query.data ?? []), [query.data]);
  const records = useMemo(() => flattenCERecords(query.data ?? []), [query.data]);
  // Deep link parity with the M09 credential drawer: consume only recordId, preserve other params/hash.
  // Wait for the list so the record's credential context is known before the param is consumed.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const recordId = params.get('recordId');
    if (!recordId || !query.data) return;
    params.delete('recordId');
    const match = records.find(record => record.id === recordId);
    if (match) setSelected(match);
    void navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate, records, query.data]);

  const filtered = useMemo(() => filterCERecords(records, { search, credentialId: credentialFilter, certificate: certificateFilter }), [records, search, credentialFilter, certificateFilter]);
  const paged = paginateCERecords(filtered, page);
  const summary = summarizeCERecords(records);
  const hasActiveFilters = Boolean(search || credentialFilter || certificateFilter !== 'all');
  const clearFilters = () => { setRawSearch(''); setSearch(''); setCredentialFilter(''); setCertificateFilter('all'); setPage(0); };
  const retry = { label: query.isFetching ? 'Retrying…' : 'Retry', onClick: () => void query.refetch() };
  const setFilter = (value: string) => { setCredentialFilter(value); setPage(0); };
  const setCertificate = (value: 'all' | 'on-file' | 'missing') => { setCertificateFilter(value); setPage(0); };

  return <PageContainer>
    <PageHeader eyebrow="Continuing Education" title="CE Records" description="Track your completed CE courses, monitor hours earned, and manage certificate documentation." actions={<><span role="status" className="inline-flex min-h-11 items-center rounded-full bg-ut-hover px-4">{summary.recordCount} record{summary.recordCount === 1 ? '' : 's'}</span><AddCERecordAction credentialOptions={credentialOptions} /></>} />
    {query.data && !query.isError && records.length > 0 && <section aria-label="CE summary" className="grid grid-cols-3 gap-4 [@media(width<=640px)]:grid-cols-1">
      <div className="rounded-2xl border border-ut-border bg-ut-surface p-4"><p className="text-sm text-ut-muted">Total CE Hours</p><strong className="text-2xl">{summary.totalHoursLabel}</strong></div>
      <div className="rounded-2xl border border-ut-border bg-ut-surface p-4"><p className="text-sm text-ut-muted">Records</p><strong className="text-2xl">{summary.recordCount}</strong></div>
      <div className="rounded-2xl border border-ut-border bg-ut-surface p-4"><p className="text-sm text-ut-muted">Missing Certificates</p><strong className={`text-2xl ${summary.missingCertificates > 0 ? 'text-[var(--ut-status-expired-text)]' : ''}`}>{summary.missingCertificates}</strong></div>
    </section>}
    {query.data && !query.isError && records.length > 0 && <section aria-label="CE record filters" className="space-y-4 rounded-2xl border border-ut-border bg-ut-surface p-4">
      <TextInput type="search" aria-label="Search CE records" placeholder="Search by course name or organization..." value={rawSearch} onChange={event => setRawSearch(event.target.value)} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-ut-muted">Credential:</span><Select aria-label="Filter by credential" value={credentialFilter} onChange={event => setFilter(event.target.value)}><option value="">All</option>{credentialOptions.map(option => <option key={option.credentialId} value={option.credentialId}>{option.credentialName}</option>)}</Select></div>
        <div role="group" aria-label="Certificate" className="flex flex-wrap items-center gap-2"><span className="text-sm text-ut-muted">Certificate:</span>{([['all', 'All'], ['on-file', 'On file'], ['missing', 'Missing']] as const).map(([value, label]) => <Button key={value} size="sm" color={certificateFilter === value ? 'blue' : 'alternative'} aria-pressed={certificateFilter === value} onClick={() => setCertificate(value)}>{label}</Button>)}</div>
        {hasActiveFilters && <Button color="alternative" size="sm" onClick={clearFilters}>Clear</Button>}
      </div>
    </section>}
    {query.data && query.isRefetchError && <StateBlock kind="error" title="CE records may be out of date" message="We could not refresh CE records. Showing the last data loaded." action={retry} />}
    {!query.data ? query.isError ? <StateBlock kind="error" title="CE records unavailable" message={query.error.message} action={retry} /> : <StateBlock kind="loading" message="Loading CE records…" /> : records.length === 0 ? <section className="rounded-2xl border border-ut-border bg-ut-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="font-semibold">No CE records yet</h2><p className="mt-1 text-sm text-ut-muted">Your CE history will appear here once completions are linked to your credentials.</p></div>
        <AddCERecordAction credentialOptions={credentialOptions} />
      </div>
      {credentialOptions.length === 0 && <p className="mt-3 text-sm text-ut-muted">Add a credential first before logging CE records.</p>}
    </section> : filtered.length === 0 ? <StateBlock kind="empty" title="No records match these filters" message="Try adjusting your search, credential, or certificate filters." action={{ label: 'Clear Filters', onClick: clearFilters }} /> : <section aria-label="CE record list">
      <p className="mb-3 text-sm text-ut-muted">{paged.showingLabel}</p>
      <div className="hidden overflow-x-auto rounded-2xl border border-ut-border bg-ut-surface [@media(width>768px)]:block">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-ut-border text-ut-muted"><th className="px-4 py-3">Course Name</th><th className="px-4 py-3">Organization</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Hours</th><th className="px-4 py-3">Credential</th><th className="px-4 py-3">Certificate</th><th className="px-4 py-3"><span className="sr-only">Open</span></th></tr></thead>
          <tbody>{paged.items.map(record => <tr key={record.id} className="cursor-pointer border-b border-ut-border last:border-0 hover:bg-ut-hover" onClick={() => setSelected(record)}>
            <td className="px-4 py-3 font-semibold">{record.title}</td>
            <td className="px-4 py-3 text-ut-muted">{record.provider}</td>
            <td className="px-4 py-3 text-ut-muted">{record.completedDateLabel}</td>
            <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-ut-hover px-3 py-1 text-xs font-semibold">{record.hoursLabel}</span></td>
            <td className="px-4 py-3">{record.credentialName}</td>
            <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${record.hasCertificate ? 'bg-[var(--ut-status-active-bg)] text-[var(--ut-status-active-text)]' : 'bg-[var(--ut-status-expired-bg)] text-[var(--ut-status-expired-text)]'}`}>{record.certificateLabel}</span></td>
            <td className="px-4 py-3"><button type="button" aria-label="Open CE record details" className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-ut-border" onClick={event => { event.stopPropagation(); setSelected(record); }}>›</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <ul className="space-y-3 [@media(width>768px)]:hidden">{paged.items.map(record => <li key={record.id}><button type="button" className="block w-full rounded-2xl border border-ut-border bg-ut-surface p-4 text-left" onClick={() => setSelected(record)}>
        <strong className="block">{record.title}</strong>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-ut-muted">Organization</dt><dd>{record.provider}</dd></div><div><dt className="text-ut-muted">Date</dt><dd>{record.completedDateLabel}</dd></div><div><dt className="text-ut-muted">Hours</dt><dd>{record.hoursLabel}</dd></div><div><dt className="text-ut-muted">Credential</dt><dd>{record.credentialName}</dd></div><div><dt className="text-ut-muted">Certificate</dt><dd>{record.certificateLabel}</dd></div></dl>
      </button></li>)}</ul>
      {paged.totalPages > 1 && <nav aria-label="CE record pagination" className="flex flex-wrap items-center gap-2">
        <Button size="sm" color="alternative" disabled={paged.page === 0} onClick={() => setPage(paged.page - 1)}>‹ Prev</Button>
        {Array.from({ length: paged.totalPages }, (_, index) => <Button key={index} size="sm" color={paged.page === index ? 'blue' : 'alternative'} aria-pressed={paged.page === index} onClick={() => setPage(index)}>{index + 1}</Button>)}
        <Button size="sm" color="alternative" disabled={paged.page >= paged.totalPages - 1} onClick={() => setPage(paged.page + 1)}>Next ›</Button>
      </nav>}
    </section>}
    {selected && <CERecordDetailDrawer key={selected.id} id={selected.id} context={{ credentialId: selected.credentialId, credentialName: selected.credentialName, credentialOrganization: selected.credentialOrganization }} onClose={() => setSelected(null)} />}
  </PageContainer>;
}
