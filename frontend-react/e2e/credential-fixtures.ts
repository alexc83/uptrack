import type { Page } from '@playwright/test';
import { allowApi, emptyDashboardResponse } from './helpers';
import { credential } from '../src/test/fixtures/api-fixtures';
import type { CredentialRequest, CredentialResponse } from '../src/lib/dto/credentials';

/** Synthetic stateful HTTP fixture; never forwards requests to the backend. */
export async function credentialApiFixture(page: Page) {
  const state = {
    credentials: [structuredClone(credential)] as CredentialResponse[],
    queries: [] as URLSearchParams[],
    writes: [] as Array<{ method: string; request?: CredentialRequest }>,
    listStatus: 200, detailStatus: 200, nextWriteStatus: 200, dashboardReads: 0,
    holdWrite: null as Promise<void> | null,
    holdRead: null as Promise<void> | null,
  };
  const newId = '00000000-0000-4000-8000-000000000010';
  for (const method of ['GET', 'POST']) allowApi(page, method, '/api/credentials');
  for (const id of [credential.id, newId, 'missing']) for (const method of ['GET', 'PUT', 'DELETE']) allowApi(page, method, `/api/credentials/${id}`);
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, async route => {
    state.dashboardReads += 1;
    await route.fulfill({ json: { ...emptyDashboardResponse, stats: { ...emptyDashboardResponse.stats, totalCredentials: state.credentials.length, activeCount: state.credentials.length } } });
  });
  await page.route(/^http:\/\/localhost:5173\/api\/credentials(?:\/[^/?]+)?(?:\?.*)?$/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/')[3];
    const method = request.method();
    const fail = (status: number) => route.fulfill({ status, json: { status, error: 'Fixture error', message: status === 404 ? 'Credential not found' : 'Fixture operation failed', timestamp: '2026-01-01T00:00:00Z' } });
    if (method === 'GET') {
      if (!id) state.queries.push(url.searchParams);
      if (state.holdRead) await state.holdRead;
      const status = id ? state.detailStatus : state.listStatus;
      if (status !== 200) return fail(status);
      if (id) {
        const data = state.credentials.find(item => item.id === id);
        return data ? route.fulfill({ json: data }) : fail(404);
      }
      const search = url.searchParams.get('search')?.toLowerCase();
      return route.fulfill({ json: state.credentials.filter(item => (!url.searchParams.get('status') || item.status === url.searchParams.get('status')) && (!url.searchParams.get('type') || item.type === url.searchParams.get('type')) && (!search || `${item.name} ${item.issuingOrganization}`.toLowerCase().includes(search))) });
    }
    const body: CredentialRequest | undefined = method === 'DELETE' ? undefined : request.postDataJSON();
    state.writes.push({ method, request: body });
    if (state.holdWrite) await state.holdWrite;
    const status = state.nextWriteStatus;
    state.nextWriteStatus = 200;
    if (status !== 200) return fail(status);
    if (method === 'DELETE') {
      state.credentials = state.credentials.filter(item => item.id !== id);
      return route.fulfill({ status: 204 });
    }
    const data: CredentialResponse = { ...credential, ...(state.credentials.find(item => item.id === id) ?? {}), ...body, id: id ?? newId };
    state.credentials = [...state.credentials.filter(item => item.id !== data.id), data];
    return route.fulfill({ status: method === 'POST' ? 201 : 200, json: data });
  });
  return state;
}
