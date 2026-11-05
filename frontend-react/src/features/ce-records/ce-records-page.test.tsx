import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ceRecordsApi } from '../../core/api/ce-records-api';
import { credentialsApi } from '../../core/api/credentials-api';
import { uploadsApi } from '../../core/api/uploads-api';
import { ApiError } from '../../core/api/api-error';
import { queryKeys } from '../../core/query/query-keys';
import { credential, credentialId, deferred, record, recordId } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';
import type { CERecordResponse } from '../../lib/dto/ce-records';
import type { CredentialResponse } from '../../lib/dto/credentials';
import { CERecordsPage } from './ce-records-page';

beforeEach(() => {
  vi.spyOn(credentialsApi, 'list').mockResolvedValue([structuredClone(credential)]);
  vi.spyOn(ceRecordsApi, 'get').mockResolvedValue(structuredClone(record));
});
afterEach(() => vi.restoreAllMocks());
const open = (path = '/ce-records') => renderWithProviders(<CERecordsPage />, { path, session: 'authenticated' });
const withCert = (record: CERecordResponse): CERecordResponse => ({ ...record, certificateUrl: 'https://files.example.test/cert.pdf', certificatePublicId: 'uptrack/users/x/certificates/cert', certificateResourceType: 'raw', certificateOriginalFilename: 'cert.pdf' });
type Scope = ReturnType<typeof within>;
async function fillForm(user: ReturnType<typeof open>['user'], root?: Scope) {
  const scope = root ?? within(document.body);
  await user.selectOptions(scope.getByRole('combobox', { name: 'Credential' }), credentialId);
  await user.type(scope.getByLabelText('Title'), ' New course ');
  await user.type(scope.getByLabelText('Provider'), ' New provider ');
  await user.type(scope.getByLabelText('Hours'), '4.5');
  await user.type(scope.getByLabelText('Date completed'), '2026-02-01');
}
function chooseCertificateFile(file: File, root?: Scope) {
  fireEvent.change((root ?? within(document.body)).getByLabelText('Certificate'), { target: { files: [file] } });
}

describe('CE list rendering, summary, filters and pagination', () => {
  it('renders the flattened list, summary cards, sorted rows and showing label', async () => {
    const older = { ...record, id: '00000000-0000-4000-8000-000000000011', title: 'Older course', dateCompleted: '2025-01-01', hours: 2.5 };
    vi.mocked(credentialsApi.list).mockResolvedValue([{ ...structuredClone(credential), ceRecords: [record, older] }]);
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'CE Records' })).toBeVisible();
    expect(document.title).toBe('CE Records — UpTrack');
    expect(credentialsApi.list).toHaveBeenCalledWith({}, { signal: expect.objectContaining({ aborted: false }) });
    const summary = await screen.findByRole('region', { name: 'CE summary' });
    expect(within(summary).getByText('Total CE Hours')).toBeVisible();
    expect(within(summary).getByText('17.5')).toBeVisible();
    expect(within(summary).getByText('Missing Certificates')).toBeVisible();
    expect(within(summary).getAllByText('2')).toHaveLength(2);
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map(row => within(row).getByText(/course|record/i).textContent)).toEqual(['Fixture record', 'Older course']);
    expect(within(rows[0]!).getByText('15 hrs')).toBeVisible();
    expect(within(rows[0]!).getByText('Fixture credential')).toBeVisible();
    expect(within(rows[0]!).getByText('Missing')).toBeVisible();
    expect(screen.getByText('Showing 1–2 of 2 records')).toBeVisible();
  });
  it('debounces search, filters by credential and certificate, and clears', async () => {
    const { user } = open();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox'), ' nope ');
    expect(await screen.findByText('No records match these filters')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 300)); });
    expect(await screen.findByRole('table')).toBeVisible();
    await user.click(within(screen.getByRole('group', { name: 'Certificate' })).getByRole('button', { name: 'On file' }));
    expect(await screen.findByText('No records match these filters')).toBeVisible();
    await user.click(within(screen.getByRole('group', { name: 'Certificate' })).getByRole('button', { name: 'Missing' }));
    expect(await screen.findByRole('table')).toBeVisible();
    const credentialSelect = screen.getByRole('combobox', { name: 'Filter by credential' });
    expect(within(credentialSelect).getByRole('option', { name: 'Fixture credential' })).toBeVisible();
    await user.selectOptions(credentialSelect, credentialId);
    expect(await screen.findByRole('table')).toBeVisible();
  });
  it('paginates beyond ten records', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ ...record, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, title: `Course ${index + 1}` }));
    vi.mocked(credentialsApi.list).mockResolvedValue([{ ...structuredClone(credential), ceRecords: many }]);
    const { user } = open();
    expect(await screen.findByText('Showing 1–10 of 12 records')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Next ›' }));
    expect(await screen.findByText('Showing 11–12 of 12 records')).toBeVisible();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '‹ Prev' }));
    expect(await screen.findByText('Showing 1–10 of 12 records')).toBeVisible();
  });
  describe('search debounce and the current page', () => {
    const twelve = () => Array.from({ length: 12 }, (_, index) => ({ ...record, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, title: `Course ${index + 1}` }));
    // A controlled clock (only setTimeout/clearTimeout) makes the timing exact instead of machine-dependent.
    const withClock = async (run: () => Promise<void>) => {
      vi.mocked(credentialsApi.list).mockResolvedValue([{ ...structuredClone(credential), ceRecords: twelve() }]);
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try { await run(); } finally { vi.useRealTimers(); }
    };
    const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
    const search = (value: string) => fireEvent.change(screen.getByLabelText('Search CE records'), { target: { value } });

    it('keeps the current page when no search change is pending, including whitespace-only edits', () => withClock(async () => {
      open();
      await advance(100); // the list is rendered; the page's 250 ms mark has not been reached
      expect(screen.getByText('Showing 1–10 of 12 records')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Next ›' }));
      expect(screen.getByText('Showing 11–12 of 12 records')).toBeVisible();
      await advance(1000); // well past any debounce started on mount
      expect(screen.getByText('Showing 11–12 of 12 records')).toBeVisible();
      expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
      search('   '); // the trimmed search is still '': nothing changed
      await advance(1000);
      expect(screen.getByText('Showing 11–12 of 12 records')).toBeVisible();
      expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true');
    }));

    it('returns to the first page once a real search change is applied', () => withClock(async () => {
      open();
      await advance(300); // list rendered and any mount-time timer already fired
      fireEvent.click(screen.getByRole('button', { name: 'Next ›' }));
      expect(screen.getByText('Showing 11–12 of 12 records')).toBeVisible();
      search('Course'); // matches all 12 records, so a stale page would stay on page 2
      await advance(200); // debounce (250 ms) not elapsed: nothing applied yet
      expect(screen.getByText('Showing 11–12 of 12 records')).toBeVisible();
      await advance(100); // 300 ms after the change: applied
      expect(screen.getByText('Showing 1–10 of 12 records')).toBeVisible();
      expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-pressed', 'true');
    }));
  });
  it('shows loading, then error with retry recovering to the list', async () => {
    const gate = deferred<CredentialResponse[]>();
    vi.mocked(credentialsApi.list).mockReturnValueOnce(gate.promise);
    const { user } = open();
    expect(await screen.findByText('Loading CE records…')).toBeVisible();
    await act(async () => gate.reject(new ApiError('http', 403, 'Forbidden')));
    expect(await screen.findByText('CE records unavailable')).toBeVisible();
    expect(screen.getByText('Forbidden')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('table')).toBeVisible();
  });
  it('shows the empty state with a disabled add action when the account has no credentials', async () => {
    vi.mocked(credentialsApi.list).mockResolvedValue([]);
    open();
    expect(await screen.findByText('No CE records yet')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Add CE Record' }).every(button => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByText('Add a credential first before logging CE records.')).toBeVisible();
  });
});

describe('CE create dialog', () => {
  it('validates required fields without a request, then submits a normalized payload and invalidates caches', async () => {
    const create = vi.spyOn(ceRecordsApi, 'create').mockResolvedValue(structuredClone(record));
    const { user, client } = open();
    client.setQueryData(queryKeys.dashboard(), {});
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add CE Record' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add CE record' });
    await user.click(within(dialog).getByRole('button', { name: 'Save CE Record' }));
    expect(await within(dialog).findAllByText('This field is required.')).toHaveLength(4);
    expect(within(dialog).getByText('Enter CE hours.')).toBeVisible();
    expect(within(dialog).getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true');
    expect(create).not.toHaveBeenCalled();
    await fillForm(user, within(dialog));
    await user.click(within(dialog).getByRole('button', { name: 'Save CE Record' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'New course', provider: 'New provider', hours: 4.5, dateCompleted: '2026-02-01', credentialId, certificateUrl: null, certificatePublicId: null, certificateResourceType: null, certificateOriginalFilename: null, certificateAssetId: null }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add CE record' })).not.toBeInTheDocument());
    expect(vi.mocked(credentialsApi.list).mock.calls.length).toBeGreaterThan(1);
    expect(client.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(true);
  });
  it('rejects unsupported certificate types client-side and keeps failed saves editable', async () => {
    const upload = vi.spyOn(uploadsApi, 'uploadCertificate');
    const create = vi.spyOn(ceRecordsApi, 'create').mockRejectedValue(new ApiError('http', 400, 'Server validation'));
    const { user } = open();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add CE Record' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add CE record' });
    chooseCertificateFile(new File(['x'], 'notes.txt', { type: 'text/plain' }), within(dialog));
    expect(await within(dialog).findByText('Unsupported file type. Please choose a PDF or common image file.')).toBeVisible();
    expect(upload).not.toHaveBeenCalled();
    await fillForm(user, within(dialog));
    await user.click(within(dialog).getByRole('button', { name: 'Save CE Record' }));
    expect(await within(dialog).findByText('Server validation')).toBeVisible();
    expect(within(dialog).getByLabelText('Title')).toHaveValue(' New course ');
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('uploads a supported certificate and includes its metadata in the create payload', async () => {
    const upload = vi.spyOn(uploadsApi, 'uploadCertificate').mockResolvedValue({ assetId: 'asset-1', url: 'https://files.example.test/new.pdf', publicId: 'pub-1', originalFilename: 'new.pdf', resourceType: 'raw' });
    const create = vi.spyOn(ceRecordsApi, 'create').mockResolvedValue(structuredClone(record));
    const { user } = open();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add CE Record' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add CE record' });
    chooseCertificateFile(new File(['pdf'], 'new.pdf', { type: 'application/pdf' }), within(dialog));
    expect(await within(dialog).findByText('Certificate uploaded successfully.')).toBeVisible();
    expect(within(dialog).getByText(/Uploaded:/).parentElement).toHaveTextContent('new.pdf');
    await fillForm(user, within(dialog));
    await user.click(within(dialog).getByRole('button', { name: 'Save CE Record' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ certificateAssetId: 'asset-1', certificateUrl: 'https://files.example.test/new.pdf', certificatePublicId: 'pub-1', certificateResourceType: 'raw', certificateOriginalFilename: 'new.pdf' })));
    expect(upload).toHaveBeenCalledTimes(1);
  });
  it('surfaces upload failures and does not submit while uploading', async () => {
    vi.spyOn(uploadsApi, 'uploadCertificate').mockRejectedValue(new ApiError('http', 413, 'Certificate upload failed.'));
    const create = vi.spyOn(ceRecordsApi, 'create');
    const { user } = open();
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Add CE Record' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add CE record' });
    chooseCertificateFile(new File(['pdf'], 'big.pdf', { type: 'application/pdf' }), within(dialog));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Certificate upload failed.');
    await fillForm(user, within(dialog));
    await user.click(within(dialog).getByRole('button', { name: 'Save CE Record' }));
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ certificateUrl: null })));
  });
});

describe('CE detail drawer, edit, certificate removal and delete', () => {
  const openDrawer = async (user: ReturnType<typeof open>['user']) => {
    await screen.findByRole('table');
    await user.click(within(screen.getByRole('table')).getAllByRole('row')[1]!);
    return screen.findByRole('dialog', { name: 'CE record details' });
  };
  it('loads the record by id and navigates to the linked credential', async () => {
    const { user, router } = open();
    const drawer = await openDrawer(user);
    expect(ceRecordsApi.get).toHaveBeenCalledWith(recordId, { signal: expect.objectContaining({ aborted: false }) });
    expect(within(drawer).getByRole('heading', { name: 'Fixture record' })).toBeVisible();
    expect(within(drawer).getByText('15 hours')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: /Fixture credential/ }));
    expect(router.state.location.pathname).toBe('/credentials');
    expect(router.state.location.search).toBe(`?credentialId=${credentialId}`);
  });
  it('edits and saves, then deletes through the confirmation dialog with cache eviction', async () => {
    const update = vi.spyOn(ceRecordsApi, 'update').mockResolvedValue({ ...record, title: 'Edited course' });
    const remove = vi.spyOn(ceRecordsApi, 'delete').mockResolvedValue();
    const { user, client } = open(`/ce-records?recordId=${recordId}`);
    client.setQueryData(queryKeys.dashboard(), {});
    const drawer = await screen.findByRole('dialog', { name: 'CE record details' });
    expect(await within(drawer).findByRole('heading', { name: 'Fixture record' })).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Edit CE Record' }));
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Edited course');
    vi.mocked(ceRecordsApi.get).mockResolvedValue({ ...record, title: 'Edited course' });
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(recordId, expect.objectContaining({ title: 'Edited course', credentialId })));
    await waitFor(() => expect(within(drawer).getByRole('heading', { name: 'Edited course' })).toBeVisible());
    await user.click(within(drawer).getByRole('button', { name: 'Delete CE Record' }));
    const confirm = screen.getByRole('dialog', { name: 'Delete CE record?' });
    expect(within(confirm).getByText(/linked credential totals will refresh/)).toBeVisible();
    await user.click(within(confirm).getByRole('button', { name: 'Delete CE Record' }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(recordId));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(client.getQueryData(queryKeys.ceRecord(recordId))).toBeUndefined();
    expect(client.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(true);
  });
  it('keeps the delete confirmation open with an inline error when deletion fails', async () => {
    const remove = vi.spyOn(ceRecordsApi, 'delete').mockRejectedValue(new ApiError('http', 403, 'Cannot delete'));
    const { user } = open();
    const drawer = await openDrawer(user);
    await user.click(within(drawer).getByRole('button', { name: 'Delete CE Record' }));
    const confirm = screen.getByRole('dialog', { name: 'Delete CE record?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete CE Record' }));
    expect(await within(confirm).findByRole('alert')).toHaveTextContent('Cannot delete');
    expect(confirm).toBeVisible();
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it('removes an existing certificate via an update with null metadata', async () => {
    vi.mocked(ceRecordsApi.get).mockResolvedValue(withCert(structuredClone(record)));
    const update = vi.spyOn(ceRecordsApi, 'update').mockResolvedValue(withCert(structuredClone(record)));
    const { user } = open();
    const drawer = await openDrawer(user);
    expect(await within(drawer).findByRole('link', { name: 'View certificate' })).toHaveAttribute('href', 'https://files.example.test/cert.pdf');
    await user.click(within(drawer).getByRole('button', { name: 'Remove Certificate' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(recordId, expect.objectContaining({ credentialId, certificateUrl: null, certificatePublicId: null, certificateResourceType: null, certificateOriginalFilename: null })));
  });
  it('views a managed certificate via an on-demand short-lived URL, not a stored link', async () => {
    vi.mocked(ceRecordsApi.get).mockResolvedValue({ ...withCert(structuredClone(record)), certificateUrl: null, certificateAssetId: 'asset-1', certificateClassification: 'MANAGED_VERIFIED' });
    const getUrl = vi.spyOn(ceRecordsApi, 'getCertificateUrl').mockResolvedValue({ url: 'https://files.example.test/short-lived', expiresAt: '2026-11-05T00:00:00Z' });
    // Popup is opened synchronously on click (user activation), then navigated to the fresh URL.
    const popup = { location: { href: 'about:blank' }, closed: false, close: vi.fn(), opener: {} as Window | null };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    const { user } = open();
    const drawer = await openDrawer(user);
    const viewButton = await within(drawer).findByRole('button', { name: 'View certificate' });
    expect(within(drawer).queryByRole('link', { name: 'View certificate' })).toBeNull();
    await user.click(viewButton);
    expect(openSpy).toHaveBeenCalledWith('', '_blank');
    await waitFor(() => expect(getUrl).toHaveBeenCalledWith(recordId));
    await waitFor(() => expect(popup.location.href).toBe('https://files.example.test/short-lived'));
    expect(popup.opener).toBeNull();
  });
  it('closes the placeholder popup and shows an inline error when the delivery URL request fails', async () => {
    vi.mocked(ceRecordsApi.get).mockResolvedValue({ ...withCert(structuredClone(record)), certificateUrl: null, certificateAssetId: 'asset-1', certificateClassification: 'MANAGED_VERIFIED' });
    vi.spyOn(ceRecordsApi, 'getCertificateUrl').mockRejectedValue(new ApiError('http', 409, 'Certificate is not available.'));
    const popup = { location: { href: 'about:blank' }, closed: false, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    const { user } = open();
    const drawer = await openDrawer(user);
    await user.click(await within(drawer).findByRole('button', { name: 'View certificate' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Certificate is not available.');
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.href).toBe('about:blank');
  });
  it('shows a popup-blocked error when the browser blocks the window', async () => {
    vi.mocked(ceRecordsApi.get).mockResolvedValue({ ...withCert(structuredClone(record)), certificateUrl: null, certificateAssetId: 'asset-1', certificateClassification: 'MANAGED_VERIFIED' });
    vi.spyOn(ceRecordsApi, 'getCertificateUrl').mockResolvedValue({ url: 'https://files.example.test/short-lived', expiresAt: '2026-11-05T00:00:00Z' });
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = open();
    const drawer = await openDrawer(user);
    await user.click(await within(drawer).findByRole('button', { name: 'View certificate' }));
    expect(await within(drawer).findByRole('alert')).toHaveTextContent('Please allow pop-ups');
  });
  it('shows the drawer error state with retry when the record cannot be loaded', async () => {
    vi.mocked(credentialsApi.list).mockResolvedValue([{ ...structuredClone(credential), ceRecords: [record, { ...record, id: 'missing' }] }]);
    vi.mocked(ceRecordsApi.get).mockRejectedValue(new ApiError('http', 404, 'CE record not found'));
    const { user } = open('/ce-records?recordId=missing');
    const drawer = await screen.findByRole('dialog', { name: 'CE record details' });
    expect(await within(drawer).findByText('CE record unavailable')).toBeVisible();
    expect(within(drawer).getByText('CE record not found')).toBeVisible();
    await user.click(within(drawer).getByRole('button', { name: 'Retry' }));
    expect(await within(drawer).findByText('CE record unavailable')).toBeVisible();
    expect(ceRecordsApi.get).toHaveBeenCalledTimes(2);
  });
  it('consumes only recordId from the URL and preserves other params, hash and history action', async () => {
    const { router } = open(`/ce-records?keep=yes&recordId=${recordId}#top`);
    expect(await screen.findByRole('dialog', { name: 'CE record details' })).toBeVisible();
    expect(router.state.location.search).toBe('?keep=yes');
    expect(router.state.location.hash).toBe('#top');
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
