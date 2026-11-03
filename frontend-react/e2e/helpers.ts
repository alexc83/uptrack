import { test as base, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ceReport, credential } from '../src/test/fixtures/api-fixtures';

// Default-deny: every /api request is aborted and fails the test unless the test declared it with allowApi()
// AND registered an explicit mock for it. M06 auth specs are the only ones that do so.
const allowedApi = new WeakMap<Page, Set<string>>();
export function allowApi(page: Page, method: string, path: string) {
  const set = allowedApi.get(page) ?? new Set<string>();
  set.add(`${method.toUpperCase()} ${path}`);
  allowedApi.set(page, set);
}
export const e2eToken = 'e2e.fixture.token';
export const e2eUser = { id: '00000000-0000-4000-8000-0000000000e2', name: 'Test User', email: 'test.user@example.test', createdAt: '2026-01-01T00:00:00Z' };
/** Seeds a stored token once per browser tab and mocks the single permitted GET /api/auth/me. */
export async function signIn(page: Page, user = e2eUser) {
  await page.addInitScript(token => {
    try {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('uptrack_token', token);
    } catch { /* storage unavailable: the session simply starts as a guest */ }
  }, e2eToken);
  allowApi(page, 'GET', '/api/auth/me');
  await page.route(/^http:\/\/localhost:5173\/api\/auth\/me$/, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
}

export const emptyDashboardResponse = {
  stats: { totalCredentials: 0, activeCount: 0, expiringSoonCount: 0, expiredCount: 0, needsCEAttentionCount: 0 },
  upcomingExpirations: [], ceAttention: [], recentActivity: [],
};
/** Declares and mocks the single GET /api/dashboard the dashboard route makes (default-deny stays in force for everything else). */
export async function mockDashboard(page: Page, body: unknown = emptyDashboardResponse, status = 200) {
  allowApi(page, 'GET', '/api/dashboard');
  await page.route(/^http:\/\/localhost:5173\/api\/dashboard$/, route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }));
}

/** Declares and mocks GET /api/users/me for the Settings page. */
export async function mockSettings(page: Page, user = e2eUser) {
  allowApi(page, 'GET', '/api/users/me');
  await page.route(/^http:\/\/localhost:5173\/api\/users\/me$/, route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
    }
    return route.fallback();
  });
}

/** Routing-only fixtures: permit only explicit credential list/detail GET handlers. */
export async function mockCredentialReads(page: Page) {
  allowApi(page, 'GET', '/api/credentials');
  await page.route(/^http:\/\/localhost:5173\/api\/credentials(?:\?.*)?$/, route => route.request().method() === 'GET'
    ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }) : route.fallback());
  await page.route(/^http:\/\/localhost:5173\/api\/credentials\/[^/?]+$/, route => {
    if (route.request().method() !== 'GET') return route.fallback();
    const path = new URL(route.request().url()).pathname;
    allowApi(page, 'GET', path);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...credential, id: decodeURIComponent(path.split('/').at(-1)!) }) });
  });
  // M11: the standalone report route renders the real page.
  await page.route(/^http:\/\/localhost:5173\/api\/credentials\/[^/?]+\/ce-report$/, route => {
    if (route.request().method() !== 'GET') return route.fallback();
    const path = new URL(route.request().url()).pathname;
    allowApi(page, 'GET', path);
    const id = decodeURIComponent(path.split('/')[3]!);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...ceReport, credential: { ...ceReport.credential, id } }) });
  });
}

export const evidenceDirectory = resolve('test-results/evidence');
export const test = base.extend<{ networkIsolation: void }>({
  networkIsolation: [async ({ page }, use) => {
    mkdirSync(evidenceDirectory, { recursive: true });
    writeFileSync(resolve(evidenceDirectory, 'browser.json'), JSON.stringify({ browser: page.context().browser()?.version(), platform: process.platform, apiRequestsExpected: 'none unless declared with allowApi' }, null, 2) + '\n');
    const apiRequests: string[] = [];
    const errors: string[] = [];
    await page.route(/^http:\/\/localhost:5173\/api(?:\/|\?|$)/, async route => {
      apiRequests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      await route.abort();
    });
    page.on('request', request => {
      if (/^\/api(?:\/|$)/.test(new URL(request.url()).pathname)) apiRequests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    });
    page.on('pageerror', error => errors.push(error.message));
    await use();
    const allowed = allowedApi.get(page) ?? new Set<string>();
    expect(apiRequests.filter(request => !allowed.has(request)), 'Unexpected API traffic (only declared, mocked auth calls are allowed)').toEqual([]);
    expect(errors, 'No uncaught browser errors').toEqual([]);
  }, { auto: true }],
});
export { expect };

export async function capture(page: Page, name: string) {
  mkdirSync(evidenceDirectory, { recursive: true });
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}.png`), animations: 'disabled' });
}
export async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const main = page.locator('#main-content');
  if (await main.count()) expect(await main.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
}
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.addInitScript(value => localStorage.setItem('uptrack-theme', value), theme);
}

/**
 * Opens an overlay the way a keyboard user does. Safari/WebKit does not focus a button on mouse click,
 * so a mouse-opened overlay has no trigger to restore focus to there; keyboard activation is the
 * path on which focus restoration is a meaningful guarantee in every engine.
 */
export async function activateWithKeyboard(page: Page, trigger: Locator) {
  await trigger.focus();
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
}

/** Flowbite returns focus in a microtask; the shared overlay also reconciles it on the next frame. */
export async function expectOverlayClosed(page: Page, overlay: Locator, returnTarget: Locator) {
  await expect(overlay).toHaveCount(0);
  // Finish the documented close lifecycle before another control takes keyboard focus.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect(returnTarget).toBeFocused();
}

/** Key that moves focus to the next link/control: Safari/WebKit on macOS skips links on plain Tab (Option+Tab reaches them). */
export function nextFocusableKey(browserName: string) {
  return browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
}
