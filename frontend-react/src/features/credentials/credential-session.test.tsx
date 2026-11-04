import { act, screen, waitFor } from '@testing-library/react';
import { onlineManager } from '@tanstack/react-query';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { credentialsApi } from '../../core/api/credentials-api';
import { ApiError } from '../../core/api/api-error';
import { useSession } from '../../core/auth/session-context';
import { queryKeys } from '../../core/query/query-keys';
import { authResponseFor, testToken } from '../../test/auth-test-utils';
import { credential, credentialRequest, deferred, user as accountA } from '../../test/fixtures/api-fixtures';
import { renderWithProviders } from '../../test/render-with-providers';
import { CredentialSessionBoundary } from './credential-session-boundary';
import { CredentialsPage } from './credentials-page';
import { useCredentialMutation } from './use-credential-mutation';
import type { CredentialResponse } from '../../lib/dto/credentials';

const accountB = { ...accountA, id: '00000000-0000-4000-8000-000000000099', name: 'Account B' };
const kinds = ['create', 'edit', 'delete'] as const;
type Kind = typeof kinds[number];
function Harness({ kind, done }: { kind: Kind; done: () => void }) {
  const { user } = useSession();
  const mutation = useCredentialMutation();
  const [draft, setDraft] = useState('');
  return <><p>{user?.name}</p><input aria-label="Local draft" value={draft} onChange={event => setDraft(event.target.value)} /><button onClick={() => { void mutation.run(kind === 'create' ? { kind, request: credentialRequest } : kind === 'edit' ? { kind, id: credential.id, request: credentialRequest } : { kind, id: credential.id }).then(ok => { if (ok) done(); }); }}>Run</button>{mutation.pending && <p>Pending write</p>}{mutation.error && <p role="alert">{mutation.error}</p>}</>;
}
function mount(kind: Kind) {
  const done = vi.fn();
  return { done, ...renderWithProviders(<CredentialSessionBoundary><Harness kind={kind} done={done} /></CredentialSessionBoundary>, { session: 'authenticated' }) };
}
afterEach(() => { onlineManager.setOnline(true); });

it.each(kinds)('%s invalidates filtered lists/dashboard/detail/records/report, but not identity caches', async kind => {
  vi.spyOn(credentialsApi, 'create').mockResolvedValue(credential);
  vi.spyOn(credentialsApi, 'update').mockResolvedValue(credential);
  vi.spyOn(credentialsApi, 'delete').mockResolvedValue();
  const { user, client, done } = mount(kind);
  await screen.findByText(accountA.name);
  const affected = [queryKeys.credentials(), queryKeys.credentials({ status: 'EXPIRED' }), queryKeys.dashboard(), queryKeys.credential(credential.id), queryKeys.credentialCERecords(credential.id), queryKeys.credentialCEReport(credential.id)];
  for (const key of [...affected, queryKeys.ceRecord('linked'), queryKeys.profile()]) client.setQueryData(key, { fixture: true });
  await user.click(screen.getByRole('button', { name: 'Run' }));
  await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  for (const key of affected) {
    if (kind === 'delete' && key[0] === 'credential') expect(client.getQueryData(key)).toBeUndefined();
    else expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  }
  expect(client.getQueryState(queryKeys.profile())?.isInvalidated).toBe(false);
  if (kind === 'delete') expect(client.getQueryData(queryKeys.ceRecord('linked'))).toBeUndefined();
});

it.each(kinds)('%s failure neither invalidates nor retries and preserves local draft', async kind => {
  const failure = new ApiError('http', 500, 'Write failed');
  const create = vi.spyOn(credentialsApi, 'create').mockRejectedValue(failure);
  const edit = vi.spyOn(credentialsApi, 'update').mockRejectedValue(failure);
  const remove = vi.spyOn(credentialsApi, 'delete').mockRejectedValue(failure);
  const { user, client } = mount(kind);
  await screen.findByText(accountA.name);
  client.setQueryData(queryKeys.dashboard(), { fixture: true });
  await user.type(screen.getByLabelText('Local draft'), 'Keep me');
  await user.click(screen.getByRole('button', { name: 'Run' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Write failed');
  expect(screen.getByLabelText('Local draft')).toHaveValue('Keep me');
  expect(client.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(false);
  expect((kind === 'create' ? create : kind === 'edit' ? edit : remove)).toHaveBeenCalledTimes(1);
});

it.each(kinds.flatMap(kind => ['success', 'error'].map(outcome => ({ kind, outcome }))))('$kind late $outcome cannot affect account B cache/UI or callbacks', async ({ kind, outcome }) => {
  const gate = deferred<CredentialResponse>();
  vi.spyOn(credentialsApi, 'create').mockReturnValue(gate.promise);
  vi.spyOn(credentialsApi, 'update').mockReturnValue(gate.promise);
  vi.spyOn(credentialsApi, 'delete').mockImplementation(async () => { await gate.promise; });
  const { user, store, authApi, client, done } = mount(kind);
  await screen.findByText(accountA.name);
  await user.type(screen.getByLabelText('Local draft'), 'Account A secret draft');
  await user.click(screen.getByRole('button', { name: 'Run' }));
  await screen.findByText('Pending write');
  authApi.login.mockResolvedValue(authResponseFor(testToken('b'), accountB));
  await act(async () => { await store.login({ email: accountB.email, password: 'synthetic' }); });
  expect(await screen.findByText(accountB.name)).toBeVisible();
  expect(screen.getByLabelText('Local draft')).toHaveValue('');
  client.setQueryData(queryKeys.dashboard(), 'B dashboard');
  client.setQueryData(queryKeys.credential(credential.id), 'B detail');
  await act(async () => {
    if (outcome === 'success') gate.resolve(credential);
    else gate.reject(new ApiError('http', 403, 'Old A error'));
    await gate.promise.catch(() => undefined);
  });
  expect(done).not.toHaveBeenCalled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(client.getQueryData(queryKeys.dashboard())).toBe('B dashboard');
  expect(client.getQueryState(queryKeys.dashboard())?.isInvalidated).toBe(false);
  expect(client.getQueryData(queryKeys.credential(credential.id))).toBe('B detail');
});

it.each(kinds)('%s paused offline cannot dispatch with a replacement session', async kind => {
  const create = vi.spyOn(credentialsApi, 'create').mockResolvedValue(credential);
  const edit = vi.spyOn(credentialsApi, 'update').mockResolvedValue(credential);
  const remove = vi.spyOn(credentialsApi, 'delete').mockResolvedValue();
  const { user, store, authApi, client } = mount(kind);
  await screen.findByText(accountA.name);
  onlineManager.setOnline(false);
  await user.click(screen.getByRole('button', { name: 'Run' }));
  const paused = client.getMutationCache().getAll()[0];
  expect(paused?.state.isPaused).toBe(true);
  authApi.login.mockResolvedValue(authResponseFor(testToken('b'), accountB));
  await act(async () => { await store.login({ email: accountB.email, password: 'synthetic' }); onlineManager.setOnline(true); await paused?.continue().catch(() => undefined); });
  expect(create).not.toHaveBeenCalled();
  expect(edit).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it('same-account reauthentication clears local form state too', async () => {
  const { user, store, authApi } = mount('create');
  await screen.findByText(accountA.name);
  await user.type(screen.getByLabelText('Local draft'), 'Discard');
  authApi.login.mockResolvedValue(authResponseFor(testToken('auth'), accountA));
  await act(async () => { await store.login({ email: accountA.email, password: 'synthetic' }); });
  expect(screen.getByLabelText('Local draft')).toHaveValue('');
});

it.each(kinds)('%s late completion after logout cannot restore cache or call UI callbacks', async kind => {
  const gate = deferred<CredentialResponse>();
  vi.spyOn(credentialsApi, 'create').mockReturnValue(gate.promise);
  vi.spyOn(credentialsApi, 'update').mockReturnValue(gate.promise);
  vi.spyOn(credentialsApi, 'delete').mockImplementation(async () => { await gate.promise; });
  const { user, store, client, done } = mount(kind);
  await screen.findByText(accountA.name);
  await user.click(screen.getByRole('button', { name: 'Run' }));
  await screen.findByText('Pending write');
  act(() => store.logout());
  await act(async () => { gate.resolve(credential); await gate.promise; });
  expect(done).not.toHaveBeenCalled();
  expect(client.getQueryCache().getAll()).toHaveLength(0);
  expect(screen.queryByLabelText('Local draft')).not.toBeInTheDocument();
});

it.each(['logout', 'switch'] as const)('aborts list/detail reads and never paints late A data after %s', async transition => {
  const listGate = deferred<CredentialResponse[]>();
  const detailGate = deferred<CredentialResponse>();
  let listSignal: AbortSignal | undefined;
  let detailSignal: AbortSignal | undefined;
  vi.spyOn(credentialsApi, 'list').mockImplementation((_filters, options) => { listSignal = options?.signal; return listGate.promise; });
  vi.spyOn(credentialsApi, 'get').mockImplementation((_id, options) => { detailSignal = options?.signal; return detailGate.promise; });
  const { store, authApi, client } = renderWithProviders(<CredentialsPage />, { path: `/credentials?credentialId=${credential.id}`, session: 'authenticated' });
  await waitFor(() => expect(detailSignal).toBeDefined());
  // Settle the mount before the session transition. waitFor() resolves as soon as the detail request starts, while
  // the last mount commit's passive effects (TanStack's observer.setOptions) may still be pending. If logout runs
  // first, React flushes those effects against the just-cleared cache, which rebuilds and refetches both queries
  // before the session boundary unmounts the page. That ordering is a test-setup race, not the behaviour under
  // test; act() flushes pending effects deterministically, with no timers.
  await act(async () => {});
  authApi.login.mockResolvedValue(authResponseFor(testToken('b'), accountB));
  vi.mocked(credentialsApi.list).mockResolvedValue([{ ...credential, name: 'B credential' }]);
  const leaks: string[] = [];
  const observer = new MutationObserver(() => { if (document.body.textContent?.includes('Old A credential')) leaks.push('A'); });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  await act(async () => { if (transition === 'logout') store.logout(); else await store.login({ email: accountB.email, password: 'synthetic' }); });
  expect(listSignal?.aborted).toBe(true);
  expect(detailSignal?.aborted).toBe(true);
  await act(async () => { listGate.resolve([{ ...credential, name: 'Old A credential' }]); detailGate.resolve({ ...credential, name: 'Old A credential' }); });
  observer.disconnect();
  expect(leaks).toEqual([]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  if (transition === 'switch') expect(await screen.findByRole('button', { name: 'B credential' })).toBeVisible();
  else expect(client.getQueryCache().getAll()).toHaveLength(0);
});

it('late protected mutation 401 is ignored after account replacement through the real transport', async () => {
  const response = deferred<Response>();
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise));
  const { user, store, authApi, done } = mount('create');
  await screen.findByText(accountA.name);
  await user.click(screen.getByRole('button', { name: 'Run' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  authApi.login.mockResolvedValue(authResponseFor(testToken('b'), accountB));
  await act(async () => { await store.login({ email: accountB.email, password: 'synthetic' }); });
  await act(async () => { response.resolve(new Response(JSON.stringify({ message: 'Old session expired' }), { status: 401 })); });
  expect(store.getSnapshot().user).toEqual(accountB);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
});
