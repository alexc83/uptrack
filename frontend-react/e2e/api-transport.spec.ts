import { test, expect, type Route } from '@playwright/test';

type FixtureWindow = Window & { cancelFixture?: () => void; replaceFixtureAuth?: () => void };
const clientModule = '/src/core/api/api-fetch.ts';
const authModule = '/src/core/api/api-auth.ts';

test.beforeEach(async ({ page }) => {
  // Unmatched API or external traffic is blocked, never forwarded to any backend.
  await page.route(/^http:\/\/localhost:5173\/api(?:\/|\?|$)/, route => route.abort('blockedbyclient'));
  await page.route(/^https?:\/\/(?!localhost:5173(?:\/|$))/, route => route.abort('blockedbyclient'));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('UpTrack — React Foundation');
});

test('imports, construction and registration do not initiate requests or store credentials', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api')) requests.push(request.url()); });
  await page.evaluate(async ({ clientModule, authModule }) => {
    const { createApiClient } = await import(clientModule) as typeof import('../src/core/api/api-fetch');
    const { registerApiAuth } = await import(authModule) as typeof import('../src/core/api/api-auth');
    createApiClient();
    const cleanup = registerApiAuth({ getToken: () => 'fixture-only' });
    cleanup();
  }, { clientModule, authModule });
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('uptrack_token'))).toBeNull();
});

test('native Fetch serializes JSON, query values and owned headers', async ({ page }) => {
  let observed = false;
  await page.route('**/api/echo**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    expect(url.searchParams.get('search')).toBe('café & + /');
    expect(url.searchParams.get('zero')).toBe('0');
    expect(url.searchParams.get('no')).toBe('false');
    expect(url.searchParams.has('empty')).toBe(false);
    expect(request.method()).toBe('POST');
    expect(request.headers()['content-type']).toBe('application/json');
    expect(request.headers().authorization).toBeUndefined();
    expect(request.postDataJSON()).toEqual({ example: true });
    observed = true;
    await route.fulfill({ status: 201, json: { received: true } });
  });
  const result = await page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    return apiFetch('/echo', { method: 'POST', json: { example: true }, query: { search: 'café & + /', zero: 0, no: false, empty: '' }, headers: { Authorization: 'caller-fixture' } });
  }, clientModule);
  expect(result).toEqual({ received: true });
  expect(observed).toBe(true);
});

test('native FormData obtains its own boundary and uses the file part convention', async ({ page }) => {
  let observed = false;
  await page.route('**/api/uploads/certificates', async route => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    const body = request.postDataBuffer()?.toString('utf8');
    expect(body).toContain('name="file"; filename="fixture.pdf"');
    expect(body).toContain('fixture certificate bytes');
    observed = true;
    await route.fulfill({ status: 201, json: { resourceType: 'raw', originalFilename: 'fixture.pdf' } });
  });
  const result = await page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    const formData = new FormData();
    formData.append('file', new File(['fixture certificate bytes'], 'fixture.pdf', { type: 'application/pdf' }));
    return apiFetch('/uploads/certificates', { method: 'POST', formData, headers: { 'Content-Type': 'incorrect' } });
  }, clientModule);
  expect(result).toEqual({ resourceType: 'raw', originalFilename: 'fixture.pdf' });
  expect(observed).toBe(true);
});

test('native Fetch distinguishes expected 204, unexpected empty JSON and malformed successful JSON', async ({ page }) => {
  await page.route('**/api/response/**', route => {
    const suffix = new URL(route.request().url()).pathname.split('/').at(-1);
    return route.fulfill(suffix === '204' ? { status: 204 } : { status: 200, body: suffix === 'empty' ? '  ' : '{bad' });
  });
  const result = await page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    const outcomes: unknown[] = [];
    outcomes.push(await apiFetch('/response/204', { method: 'DELETE', response: 'empty' }) === undefined);
    for (const suffix of ['204', 'empty', 'malformed']) {
      try { await apiFetch(`/response/${suffix}`); }
      catch (error) {
        const failure = error as import('../src/core/api/api-error').ApiError;
        outcomes.push({ kind: failure.kind, status: failure.status });
      }
    }
    return outcomes;
  }, clientModule);
  expect(result).toEqual([true, { kind: 'response', status: 204 }, { kind: 'response', status: 200 }, { kind: 'response', status: 200 }]);
});

test('HTTP errors preserve status, flat messages and non-JSON details in the browser', async ({ page }) => {
  await page.route('**/api/error/**', route => {
    const status = Number(new URL(route.request().url()).pathname.split('/').at(-1));
    return status === 502 ? route.fulfill({ status, contentType: 'text/html', body: '<html>fixture proxy error</html>' }) : route.fulfill({ status, json: { status: 999, message: 'name: must not be blank; hours: must be greater than 0' } });
  });
  const result = await page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    const outcomes: unknown[] = [];
    for (const status of [400, 401, 403, 404, 409, 429, 500, 502]) {
      try { await apiFetch(`/error/${status}`); }
      catch (error) {
        const failure = error as import('../src/core/api/api-error').ApiError;
        outcomes.push({ kind: failure.kind, status: failure.status, message: failure.message, rawHtml: typeof failure.details === 'string' });
      }
    }
    return outcomes;
  }, clientModule);
  expect(result).toEqual([400, 401, 403, 404, 409, 429, 500, 502].map(status => ({ kind: 'http', status, message: status === 502 ? 'Something went wrong. Please try again.' : 'name: must not be blank; hours: must be greater than 0', rawHtml: status === 502 })));
});

test('native pre-abort and in-flight abort preserve cancellation instead of network errors', async ({ page }) => {
  let accept!: (route: Route) => void;
  const arrived = new Promise<Route>(resolve => { accept = resolve; });
  await page.route('**/api/slow', route => { accept(route); });
  const pending = page.evaluate(async modulePath => {
    const { apiFetch } = await import(modulePath) as typeof import('../src/core/api/api-fetch');
    const first = new AbortController();
    const reason = new Error('fixture pre-abort');
    first.abort(reason);
    let preAbortIdentity = false;
    try { await apiFetch('/never-dispatched', { signal: first.signal }); } catch (error) { preAbortIdentity = error === reason; }
    const controller = new AbortController();
    (window as FixtureWindow).cancelFixture = () => controller.abort();
    try { await apiFetch('/slow', { signal: controller.signal }); return { unexpected: true }; }
    catch (error) {
      const failure = error as Error;
      return { preAbortIdentity, name: failure.name, sameReason: error === controller.signal.reason, apiError: 'kind' in failure };
    }
  }, clientModule);
  const route = await arrived;
  await page.evaluate(() => (window as FixtureWindow).cancelFixture?.());
  expect(await pending).toEqual({ preAbortIdentity: true, name: 'AbortError', sameReason: true, apiError: false });
  await route.abort().catch(() => undefined);
});

test('origin/path overrides and API redirects cannot send bearer credentials elsewhere', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://localhost:5173') externalRequests.push(request.url()); });
  await page.route('**/api/redirect', route => route.fulfill({ status: 302, headers: { Location: 'https://outside.fixture.invalid/' } }));
  const result = await page.evaluate(async ({ clientModule, authModule }) => {
    const { apiFetch } = await import(clientModule) as typeof import('../src/core/api/api-fetch');
    const { registerApiAuth } = await import(authModule) as typeof import('../src/core/api/api-auth');
    const cleanup = registerApiAuth({ getToken: () => 'fixture-only' });
    const outcomes: unknown[] = [];
    for (const path of ['https://outside.fixture.invalid/resource', '//outside.fixture.invalid', '../outside']) {
      try { await apiFetch(path); } catch (error) { outcomes.push((error as Error).name); }
    }
    try { await apiFetch('/redirect'); }
    catch (error) { const failure = error as import('../src/core/api/api-error').ApiError; outcomes.push({ kind: failure.kind, status: failure.status }); }
    cleanup();
    return outcomes;
  }, { clientModule, authModule });
  expect(result).toEqual(['TypeError', 'TypeError', 'TypeError', { kind: 'network', status: 0 }]);
  expect(externalRequests).toEqual([]);
});

test('a delayed native 401 cannot notify a replacement adapter/session', async ({ page }) => {
  let accept!: (route: Route) => void;
  const arrived = new Promise<Route>(resolve => { accept = resolve; });
  await page.route('**/api/protected-slow', route => { accept(route); });
  const pending = page.evaluate(async ({ clientModule, authModule }) => {
    const { apiFetch } = await import(clientModule) as typeof import('../src/core/api/api-fetch');
    const { registerApiAuth } = await import(authModule) as typeof import('../src/core/api/api-auth');
    let oldCalls = 0; let newCalls = 0;
    const cleanupOld = registerApiAuth({ getToken: () => 'fixture-old', onUnauthorized: () => { oldCalls++; } });
    let cleanupNew: (() => void) | undefined;
    (window as FixtureWindow).replaceFixtureAuth = () => { cleanupNew = registerApiAuth({ getToken: () => 'fixture-new', onUnauthorized: () => { newCalls++; } }); cleanupOld(); };
    let status = 0;
    try { await apiFetch('/protected-slow'); } catch (error) { status = (error as import('../src/core/api/api-error').ApiError).status; }
    cleanupOld(); cleanupNew?.();
    return { oldCalls, newCalls, status };
  }, { clientModule, authModule });
  const route = await arrived;
  expect(route.request().headers().authorization).toBe('Bearer fixture-old');
  await page.evaluate(() => (window as FixtureWindow).replaceFixtureAuth?.());
  await route.fulfill({ status: 401, json: { message: 'Fixture unauthorized' } });
  expect(await pending).toEqual({ oldCalls: 0, newCalls: 0, status: 401 });
});
