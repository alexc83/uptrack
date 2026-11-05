import type { Page } from '@playwright/test';
import type { Route } from '@playwright/test';
import { allowApi } from './helpers';
import { credential, record } from '../src/test/fixtures/api-fixtures';
import type { CredentialResponse } from '../src/lib/dto/credentials';
import type { CERecordRequest, CERecordResponse } from '../src/lib/dto/ce-records';

/** Synthetic stateful HTTP fixture; never forwards requests to the backend. CE records live inside credential payloads, as in Angular. */
export async function ceRecordApiFixture(page: Page) {
  const state = {
    credentials: [structuredClone(credential)] as CredentialResponse[],
    writes: [] as Array<{ method: string; request?: CERecordRequest }>,
    uploads: [] as string[],
    listStatus: 200,
    recordGetStatus: 200,
    nextWriteStatus: 200,
    uploadStatus: 201,
    holdRead: null as Promise<void> | null,
    holdWrite: null as Promise<void> | null,
  };
  const newId = '00000000-0000-4000-8000-000000000020';
  const fail = (route: Route, status: number, message = 'Fixture operation failed') => route.fulfill({ status, json: { status, error: 'Fixture error', message, timestamp: '2026-01-01T00:00:00Z' } });
  const findRecord = (id: string) => {
    for (const owner of state.credentials) {
      const found = owner.ceRecords.find(item => item.id === id);
      if (found) return { record: found, owner };
    }
    return null;
  };
  allowApi(page, 'GET', '/api/credentials');
  for (const method of ['GET', 'POST']) allowApi(page, method, '/api/ce-records');
  for (const id of [record.id, newId]) for (const method of ['GET', 'PUT', 'DELETE']) allowApi(page, method, `/api/ce-records/${id}`);
  allowApi(page, 'POST', '/api/uploads/certificates');
  await page.route(/^http:\/\/localhost:5173\/api\/credentials(?:\?.*)?$/, async route => {
    if (route.request().method() !== 'GET') return route.fallback();
    if (state.holdRead) await state.holdRead;
    if (state.listStatus !== 200) return fail(route, state.listStatus);
    return route.fulfill({ json: state.credentials });
  });
  await page.route(/^http:\/\/localhost:5173\/api\/ce-records(?:\/[^/?]+)?(?:\?.*)?$/, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const id = url.pathname.split('/')[3];
    const method = request.method();
    if (method === 'GET') {
      if (state.holdRead) await state.holdRead;
      if (!id) return route.fulfill({ json: state.credentials.flatMap(owner => owner.ceRecords) });
      if (state.recordGetStatus !== 200) return fail(route, state.recordGetStatus, 'CE record not found');
      const found = findRecord(id);
      return found ? route.fulfill({ json: found.record }) : fail(route, 404, 'CE record not found');
    }
    const body = request.postDataJSON() as CERecordRequest | undefined;
    state.writes.push({ method, request: body });
    if (state.holdWrite) await state.holdWrite;
    const status = state.nextWriteStatus;
    state.nextWriteStatus = 200;
    if (status !== 200) return fail(route, status);
    if (method === 'DELETE') {
      const found = id ? findRecord(id) : null;
      if (found) found.owner.ceRecords = found.owner.ceRecords.filter(item => item.id !== id);
      return route.fulfill({ status: 204 });
    }
    if (method === 'POST') {
      const owner = state.credentials.find(item => item.id === body?.credentialId);
      const created: CERecordResponse = { id: newId, title: body!.title, provider: body!.provider, hours: body!.hours, dateCompleted: body!.dateCompleted, certificateUrl: body!.certificateUrl ?? null, certificatePublicId: body!.certificatePublicId ?? null, certificateResourceType: body!.certificateResourceType ?? null, certificateOriginalFilename: body!.certificateOriginalFilename ?? null, certificateAssetId: body!.certificateAssetId ?? null, certificateClassification: body!.certificateAssetId ? 'MANAGED_VERIFIED' : null };
      if (owner) owner.ceRecords = [...owner.ceRecords, created];
      return route.fulfill({ status: 201, json: created });
    }
    // PUT
    const found = id ? findRecord(id) : null;
    if (!found || !body) return fail(route, 404, 'CE record not found');
    const updated: CERecordResponse = { ...found.record, title: body.title, provider: body.provider, hours: body.hours, dateCompleted: body.dateCompleted, certificateUrl: body.certificateUrl ?? null, certificatePublicId: body.certificatePublicId ?? null, certificateResourceType: body.certificateResourceType ?? null, certificateOriginalFilename: body.certificateOriginalFilename ?? null, certificateAssetId: body.certificateAssetId ?? null, certificateClassification: body.certificateAssetId ? 'MANAGED_VERIFIED' : found.record.certificateClassification };
    found.owner.ceRecords = found.owner.ceRecords.map(item => (item.id === id ? updated : item));
    return route.fulfill({ status: 200, json: updated });
  });
  await page.route(/^http:\/\/localhost:5173\/api\/uploads\/certificates$/, async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    const match = /filename="([^"]+)"/.exec(route.request().postData() ?? '');
    const filename = match?.[1] ?? 'certificate';
    state.uploads.push(filename);
    if (state.uploadStatus !== 201) return fail(route, state.uploadStatus);
    return route.fulfill({ status: 201, json: { assetId: `asset-${filename}`, url: `https://files.example.test/${filename}`, publicId: `pub-${filename}`, originalFilename: filename, resourceType: 'raw' } });
  });
  return state;
}
